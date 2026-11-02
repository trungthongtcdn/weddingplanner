"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getWeddingAccess, canManageWedding } from "@/lib/access";
import { createWedding } from "@/lib/wedding-setup";
import { newId, newToken } from "@/lib/ids";
import { REGIONS, MEMBER_ROLES, SIDES } from "@/lib/db/schema";
import { titleCase } from "@/lib/text";

export type FormState = { error?: string; ok?: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày hợp lệ");
const optYear = z
  .string()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (v > 1940 && v < 2015), "Năm sinh chưa hợp lệ");

const weddingSchema = z.object({
  myRole: z.enum(["groom", "bride"]),
  groomName: z.string().trim().min(1, "Nhập tên chú rể").max(60),
  brideName: z.string().trim().min(1, "Nhập tên cô dâu").max(60),
  groomRegion: z.enum(REGIONS),
  brideRegion: z.enum(REGIONS),
  groomProvince: z.string().trim().max(60).optional(),
  brideProvince: z.string().trim().max(60).optional(),
  weddingDate: isoDate,
  groomBirthYear: optYear,
  brideBirthYear: optYear,
});

export async function createWeddingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = weddingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa đầy đủ" };
  const d = parsed.data;
  const groomName = titleCase(d.groomName);
  const brideName = titleCase(d.brideName);
  const id = await createWedding({
    userId: user.id,
    myName: d.myRole === "groom" ? groomName : brideName,
    groomName,
    brideName,
    groomRegion: d.groomRegion,
    brideRegion: d.brideRegion,
    groomProvince: d.groomProvince,
    brideProvince: d.brideProvince,
    weddingDate: d.weddingDate,
    groomBirthYear: d.groomBirthYear,
    brideBirthYear: d.brideBirthYear,
  });
  if (!user.name) await db.update(schema.users).set({ name: d.myRole === "groom" ? groomName : brideName }).where(eq(schema.users.id, user.id));
  redirect(`/cuoi/${id}`);
}

export async function updateWeddingAction(weddingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return { error: "Chỉ cô dâu chú rể sửa được thông tin này." };
  const parsed = weddingSchema.omit({ myRole: true }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa đầy đủ" };
  const d = parsed.data;
  await db
    .update(schema.weddings)
    .set({
      groomName: titleCase(d.groomName),
      brideName: titleCase(d.brideName),
      groomRegion: d.groomRegion,
      brideRegion: d.brideRegion,
      groomProvince: d.groomProvince || null,
      brideProvince: d.brideProvince || null,
      weddingDate: d.weddingDate,
      groomBirthYear: d.groomBirthYear,
      brideBirthYear: d.brideBirthYear,
    })
    .where(eq(schema.weddings.id, weddingId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã lưu thông tin đám cưới." };
}

export async function updateInviteSettingsAction(weddingId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return { error: "Chỉ cô dâu chú rể sửa được lời mời." };
  const message = String(form.get("inviteMessage") ?? "").trim().slice(0, 600);
  await db
    .update(schema.weddings)
    .set({ inviteMessage: message || null, giftQrEnabled: form.get("giftQrEnabled") === "on" })
    .where(eq(schema.weddings.id, weddingId));
  revalidatePath(`/cuoi/${weddingId}/tiec`);
  return { ok: "Đã lưu lời mời." };
}

const partySchema = z.object({
  name: z.string().trim().min(1, "Nhập tên tiệc").max(80),
  side: z.enum(SIDES),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ"),
  venue: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  seatsPerTable: z.coerce.number().int().min(4).max(20),
});

export async function savePartyAction(weddingId: string, partyId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return { error: "Chỉ cô dâu chú rể sửa được tiệc." };
  const parsed = partySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin tiệc chưa đầy đủ" };
  const d = parsed.data;
  const values = {
    name: d.name,
    side: d.side,
    startsAt: `${d.date}T${d.time}`,
    venue: d.venue || null,
    address: d.address || null,
    seatsPerTable: d.seatsPerTable,
  };
  if (partyId) {
    await db.update(schema.parties).set(values).where(and(eq(schema.parties.id, partyId), eq(schema.parties.weddingId, weddingId)));
  } else {
    await db.insert(schema.parties).values({ id: newId(), weddingId, sortOrder: 99, ...values });
  }
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã lưu tiệc." };
}

export async function deletePartyAction(weddingId: string, partyId: string) {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return;
  await db.delete(schema.parties).where(and(eq(schema.parties.id, partyId), eq(schema.parties.weddingId, weddingId)));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

/* ---------------------------- Thành viên ---------------------------- */

const INVITE_LABEL: Record<(typeof MEMBER_ROLES)[number], string> = {
  COUPLE: "Nửa kia",
  PARENT_GROOM: "Bố mẹ nhà trai",
  PARENT_BRIDE: "Bố mẹ nhà gái",
  HELPER: "Người hỗ trợ",
};

export async function createInviteAction(weddingId: string, form: FormData) {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return;
  const role = z.enum(MEMBER_ROLES).catch("HELPER").parse(form.get("role"));
  const label = String(form.get("label") ?? "").trim().slice(0, 60) || INVITE_LABEL[role];
  await db.insert(schema.memberInvites).values({
    id: newId(),
    weddingId,
    token: newToken(18),
    role,
    label,
    createdBy: access.member.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });
  revalidatePath(`/cuoi/${weddingId}/thanh-vien`);
}

export async function revokeInviteAction(weddingId: string, inviteId: string) {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role)) return;
  await db.delete(schema.memberInvites).where(and(eq(schema.memberInvites.id, inviteId), eq(schema.memberInvites.weddingId, weddingId)));
  revalidatePath(`/cuoi/${weddingId}/thanh-vien`);
}

export async function removeMemberAction(weddingId: string, memberId: string) {
  const access = await getWeddingAccess(weddingId);
  if (!canManageWedding(access.member.role) || memberId === access.member.id) return;
  await db.delete(schema.members).where(and(eq(schema.members.id, memberId), eq(schema.members.weddingId, weddingId)));
  revalidatePath(`/cuoi/${weddingId}/thanh-vien`);
}

export async function acceptInviteAction(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(`/moi/${token}`);
  const displayName = titleCase(String(form.get("displayName") ?? "")).slice(0, 60);
  if (!displayName) return { error: "Nhập tên để mọi người nhận ra bạn." };
  const [invite] = await db.select().from(schema.memberInvites).where(eq(schema.memberInvites.token, token)).limit(1);
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) return { error: "Lời mời đã hết hạn hoặc đã được dùng." };
  const [existing] = await db
    .select()
    .from(schema.members)
    .where(and(eq(schema.members.weddingId, invite.weddingId), eq(schema.members.userId, user.id)))
    .limit(1);
  if (!existing) {
    await db.insert(schema.members).values({
      id: newId(),
      weddingId: invite.weddingId,
      userId: user.id,
      role: invite.role,
      displayName,
      createdAt: new Date(),
    });
    await db.update(schema.memberInvites).set({ usedAt: new Date(), usedBy: user.id }).where(eq(schema.memberInvites.id, invite.id));
  }
  if (!user.name) await db.update(schema.users).set({ name: displayName }).where(eq(schema.users.id, user.id));
  redirect(`/cuoi/${invite.weddingId}`);
}

export async function setFundSharingAction(weddingId: string, fundId: string, coupleCanView: boolean) {
  const access = await getWeddingAccess(weddingId);
  const [fund] = await db.select().from(schema.funds).where(and(eq(schema.funds.id, fundId), eq(schema.funds.weddingId, weddingId))).limit(1);
  if (!fund) return;
  const owner = (fund.side === "NHA_TRAI" && access.member.role === "PARENT_GROOM") || (fund.side === "NHA_GAI" && access.member.role === "PARENT_BRIDE");
  if (!owner) return;
  await db.update(schema.funds).set({ coupleCanView }).where(eq(schema.funds.id, fundId));
  revalidatePath(`/cuoi/${weddingId}/mung`, "layout");
}
