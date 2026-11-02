"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, guestSidesFor } from "@/lib/access";
import { newGiftCode, newId, newToken } from "@/lib/ids";
import { normalizeVnPhone } from "@/lib/phone";
import { CALL_RESULTS, SIDES, type GuestStatus } from "@/lib/db/schema";
import { advance } from "@/lib/guest-status";
import { titleCase } from "@/lib/text";

export type AddGuestsResult = {
  added: number;
  invalidPhones: string[];
  duplicates: { name: string; phone: string; existing: string; side: string }[];
  error?: string;
};

const addSchema = z.object({
  side: z.enum(SIDES),
  groupName: z.string().trim().max(60).optional(),
  partyIds: z.array(z.string()).max(10),
  guests: z
    .array(z.object({ name: z.string().trim().min(1).max(80), honorific: z.string().trim().max(20).nullable(), phone: z.string().max(20).nullable() }))
    .min(1, "Chưa có khách nào")
    .max(300, "Mỗi lần thêm tối đa 300 khách"),
});

async function uniqueCode(weddingId: string, taken: Set<string>): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const c = newGiftCode();
    if (taken.has(c)) continue;
    taken.add(c);
    return c;
  }
  throw new Error("Không tạo được mã khách");
}

export async function addGuestsAction(weddingId: string, payload: unknown): Promise<AddGuestsResult> {
  const access = await getWeddingAccess(weddingId);
  const parsed = addSchema.safeParse(payload);
  if (!parsed.success) return { added: 0, invalidPhones: [], duplicates: [], error: parsed.error.issues[0]?.message ?? "Dữ liệu chưa đúng" };
  const { side, groupName, partyIds, guests } = parsed.data;
  if (!guestSidesFor(access.member.role).includes(side)) return { added: 0, invalidPhones: [], duplicates: [], error: "Bạn không có quyền thêm vào danh sách này." };

  const parties = partyIds.length
    ? await db.select({ id: schema.parties.id }).from(schema.parties).where(and(eq(schema.parties.weddingId, weddingId), inArray(schema.parties.id, partyIds)))
    : [];
  const existing = await db
    .select({ name: schema.guests.name, phone: schema.guests.phone, side: schema.guests.side, giftCode: schema.guests.giftCode })
    .from(schema.guests)
    .where(eq(schema.guests.weddingId, weddingId));
  const takenCodes = new Set(existing.map((g) => g.giftCode));
  const sideLabel = { CAP_DOI: "cặp đôi", NHA_TRAI: "nhà trai", NHA_GAI: "nhà gái" } as const;

  const invalidPhones: string[] = [];
  const duplicates: AddGuestsResult["duplicates"] = [];
  const rows: (typeof schema.guests.$inferInsert)[] = [];
  const now = new Date();
  for (const g of guests) {
    let phone: string | null = null;
    if (g.phone) {
      phone = normalizeVnPhone(g.phone);
      if (!phone) invalidPhones.push(`${g.name} (${g.phone})`);
    }
    if (phone) {
      const dup = existing.find((e) => e.phone === phone) ?? null;
      if (dup) duplicates.push({ name: g.name, phone, existing: dup.name, side: sideLabel[dup.side] });
    }
    rows.push({
      id: newId(),
      weddingId,
      side,
      createdByMemberId: access.member.id,
      name: titleCase(g.name),
      honorific: g.honorific?.toLocaleLowerCase("vi") || null,
      phone,
      groupName: groupName || null,
      status: "CHUA_MOI",
      inviteToken: newToken(12),
      giftCode: await uniqueCode(weddingId, takenCodes),
      createdAt: now,
    });
    if (phone) existing.push({ name: g.name, phone, side, giftCode: "" });
  }
  await db.transaction(async (tx) => {
    await tx.insert(schema.guests).values(rows);
    const links = rows.flatMap((r) => parties.map((p) => ({ guestId: r.id!, partyId: p.id })));
    if (links.length) await tx.insert(schema.guestParties).values(links);
  });
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { added: rows.length, invalidPhones, duplicates };
}

/** Lấy khách và kiểm tra thành viên được phép thao tác. */
async function guestForMember(weddingId: string, guestId: string) {
  const access = await getWeddingAccess(weddingId);
  const [guest] = await db.select().from(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.weddingId, weddingId))).limit(1);
  if (!guest || !guestSidesFor(access.member.role).includes(guest.side)) return null;
  return { access, guest };
}

export type GuestFormState = { error?: string; ok?: string };

export async function updateGuestAction(weddingId: string, guestId: string, _prev: GuestFormState, form: FormData): Promise<GuestFormState> {
  const r = await guestForMember(weddingId, guestId);
  if (!r) return { error: "Không tìm thấy khách." };
  const name = titleCase(String(form.get("name") ?? "")).slice(0, 80);
  if (!name) return { error: "Nhập tên khách." };
  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizeVnPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Số điện thoại chưa đúng." };
  const sideRaw = String(form.get("side") ?? r.guest.side);
  const side = (SIDES as readonly string[]).includes(sideRaw) && guestSidesFor(r.access.member.role).includes(sideRaw as (typeof SIDES)[number]) ? (sideRaw as (typeof SIDES)[number]) : r.guest.side;
  const partyIds = form.getAll("partyIds").map(String);
  const parties = partyIds.length
    ? await db.select({ id: schema.parties.id }).from(schema.parties).where(and(eq(schema.parties.weddingId, weddingId), inArray(schema.parties.id, partyIds)))
    : [];
  await db.transaction(async (tx) => {
    await tx
      .update(schema.guests)
      .set({
        name,
        phone,
        side,
        honorific: String(form.get("honorific") ?? "").trim().toLocaleLowerCase("vi").slice(0, 20) || null,
        groupName: String(form.get("groupName") ?? "").trim().slice(0, 60) || null,
        note: String(form.get("note") ?? "").trim().slice(0, 300) || null,
      })
      .where(eq(schema.guests.id, guestId));
    await tx.delete(schema.guestParties).where(eq(schema.guestParties.guestId, guestId));
    if (parties.length) await tx.insert(schema.guestParties).values(parties.map((p) => ({ guestId, partyId: p.id })));
  });
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã lưu." };
}

export async function deleteGuestAction(weddingId: string, guestId: string) {
  const r = await guestForMember(weddingId, guestId);
  if (!r) return;
  await db.delete(schema.guests).where(eq(schema.guests.id, guestId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function setCallResultAction(weddingId: string, guestId: string, result: string) {
  const r = await guestForMember(weddingId, guestId);
  const parsed = z.enum(CALL_RESULTS).safeParse(result);
  if (!r || !parsed.success) return;
  const status: GuestStatus = parsed.data === "KHONG_NGHE" ? r.guest.status : advance(r.guest.status, "DA_GOI");
  await db.update(schema.guests).set({ callResult: parsed.data, status }).where(eq(schema.guests.id, guestId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function markInviteSentAction(weddingId: string, guestId: string) {
  const r = await guestForMember(weddingId, guestId);
  if (!r) return;
  await db
    .update(schema.guests)
    .set({ status: advance(r.guest.status, "DA_GUI_THIEP"), sentAt: new Date() })
    .where(eq(schema.guests.id, guestId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function markAttendedAction(weddingId: string, guestId: string) {
  const r = await guestForMember(weddingId, guestId);
  if (!r) return;
  await db.update(schema.guests).set({ status: advance(r.guest.status, "CO_MAT") }).where(eq(schema.guests.id, guestId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

/* ------------------------- Trang thiệp công khai ------------------------- */

/** Ghi nhận khách đã mở thiệp (gọi từ trình duyệt, không tính lượt xem trước của Zalo). */
export async function markOpenedAction(token: string) {
  const [g] = await db.select().from(schema.guests).where(eq(schema.guests.inviteToken, token)).limit(1);
  if (!g) return;
  await db
    .update(schema.guests)
    .set({ status: advance(g.status, "DA_MO"), openedAt: g.openedAt ?? new Date() })
    .where(eq(schema.guests.id, g.id));
}

export async function remindOptInAction(token: string) {
  await db.update(schema.guests).set({ remindOptIn: true }).where(eq(schema.guests.inviteToken, token));
}
