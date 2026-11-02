"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, fundPermission, parentJoinedMap } from "@/lib/access";
import { requireUser } from "@/lib/auth/session";
import { newId, sha256 } from "@/lib/ids";
import { BANKS } from "@/lib/vietqr";
import { GIFT_METHODS } from "@/lib/db/schema";
import { matchTransfer, suggestGuests, type Suggestion } from "@/lib/matching";
import { parseGiftUtterance, formatVnd } from "@/lib/vn-money";
import { advance } from "@/lib/guest-status";
import { stripDiacritics, titleCase } from "@/lib/text";

async function fundFor(weddingId: string, fundId: string, need: "view" | "manage") {
  const access = await getWeddingAccess(weddingId);
  const [fund] = await db.select().from(schema.funds).where(and(eq(schema.funds.id, fundId), eq(schema.funds.weddingId, weddingId))).limit(1);
  if (!fund) return null;
  const perm = fundPermission(access.member.role, fund, await parentJoinedMap(weddingId));
  if (need === "manage" ? !perm.manage : !perm.view) return null;
  return { access, fund };
}

async function giftFor(weddingId: string, giftId: string) {
  const [gift] = await db.select().from(schema.gifts).where(and(eq(schema.gifts.id, giftId), eq(schema.gifts.weddingId, weddingId))).limit(1);
  if (!gift) return null;
  const f = await fundFor(weddingId, gift.fundId, "manage");
  return f ? { ...f, gift } : null;
}

async function markGuestGifted(guestId: string | null) {
  if (!guestId) return;
  const [g] = await db.select({ status: schema.guests.status }).from(schema.guests).where(eq(schema.guests.id, guestId));
  if (g) await db.update(schema.guests).set({ status: advance(g.status, "DA_MUNG") }).where(eq(schema.guests.id, guestId));
}

/** Khách khớp được với một quỹ: khách thuộc danh sách của bên sở hữu quỹ. */
async function guestsOfFund(weddingId: string, side: string) {
  return db
    .select({ id: schema.guests.id, name: schema.guests.name, honorific: schema.guests.honorific, groupName: schema.guests.groupName, giftCode: schema.guests.giftCode })
    .from(schema.guests)
    .where(and(eq(schema.guests.weddingId, weddingId), eq(schema.guests.side, side as "CAP_DOI")));
}

export type FormState = { error?: string; ok?: string };

/* ----------------------------- Tài khoản quỹ ----------------------------- */

export async function updateFundBankAction(weddingId: string, fundId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const f = await fundFor(weddingId, fundId, "manage");
  if (!f) return { error: "Bạn không quản lý quỹ này." };
  const bin = String(form.get("bankBin") ?? "");
  const account = String(form.get("accountNumber") ?? "").replace(/\s/g, "");
  const holder = stripDiacritics(String(form.get("accountName") ?? "")).toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
  if (!bin && !account) {
    await db.update(schema.funds).set({ bankBin: null, accountNumber: null, accountName: null }).where(eq(schema.funds.id, fundId));
    revalidatePath(`/cuoi/${weddingId}/mung`, "layout");
    return { ok: "Đã xoá tài khoản nhận." };
  }
  if (!BANKS.some((b) => b.bin === bin)) return { error: "Chọn ngân hàng." };
  if (!/^\d{6,19}$/.test(account)) return { error: "Số tài khoản gồm 6–19 chữ số." };
  await db.update(schema.funds).set({ bankBin: bin, accountNumber: account, accountName: holder || null }).where(eq(schema.funds.id, fundId));
  revalidatePath(`/cuoi/${weddingId}/mung`, "layout");
  return { ok: "Đã lưu. Khách sẽ thấy mã QR chuyển vào tài khoản này." };
}

/* ------------------------------- Phong bì ------------------------------- */

export type EnvelopeParse = {
  amount: number;
  nameText: string;
  itemDesc: string | null;
  suggestions: (Suggestion & { name: string; honorific: string | null; groupName: string | null })[];
};

export async function parseEnvelopeAction(weddingId: string, fundId: string, text: string): Promise<EnvelopeParse | null> {
  const f = await fundFor(weddingId, fundId, "manage");
  if (!f) return null;
  const parsed = parseGiftUtterance(text.slice(0, 200));
  const guests = await guestsOfFund(weddingId, f.fund.side);
  const sugg = parsed.nameText ? suggestGuests(parsed.nameText, guests, 4) : [];
  return {
    ...parsed,
    suggestions: sugg.map((s) => {
      const g = guests.find((x) => x.id === s.guestId)!;
      return { ...s, name: g.name, honorific: g.honorific, groupName: g.groupName };
    }),
  };
}

const giftInput = z.object({
  guestId: z.string().nullable(),
  method: z.enum(GIFT_METHODS),
  amount: z.number().int().min(0).max(10_000_000_000),
  itemDesc: z.string().trim().max(120).nullable(),
  note: z.string().trim().max(200).nullable(),
  rawText: z.string().trim().max(300).nullable(),
});

export async function addGiftAction(weddingId: string, fundId: string, input: unknown): Promise<FormState> {
  const f = await fundFor(weddingId, fundId, "manage");
  if (!f) return { error: "Bạn không quản lý quỹ này." };
  const parsed = giftInput.safeParse(input);
  if (!parsed.success) return { error: "Dữ liệu chưa đúng." };
  const d = parsed.data;
  if (!d.amount && !d.itemDesc) return { error: "Nhập số tiền hoặc món quà." };
  let guestId: string | null = null;
  if (d.guestId) {
    const [g] = await db.select({ id: schema.guests.id }).from(schema.guests).where(and(eq(schema.guests.id, d.guestId), eq(schema.guests.weddingId, weddingId)));
    guestId = g?.id ?? null;
  }
  await db.insert(schema.gifts).values({
    id: newId(),
    weddingId,
    fundId,
    guestId,
    method: d.method,
    amount: d.amount,
    itemDesc: d.itemDesc,
    note: d.note,
    rawText: d.rawText,
    matchStatus: guestId ? "MANUAL" : "UNMATCHED",
    receivedAt: new Date().toISOString().slice(0, 10),
    createdByMemberId: f.access.member.id,
    createdAt: new Date(),
  });
  await markGuestGifted(guestId);
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã ghi." };
}

/* -------------------------------- Sao kê -------------------------------- */

export type ImportRow = { date: string; amount: number; description: string };
export type ImportResult = { imported: number; autoCode: number; autoName: number; unmatched: number; duplicate: number; skipped: number; error?: string };

export async function importStatementAction(weddingId: string, fundId: string, rows: ImportRow[]): Promise<ImportResult> {
  const empty = { imported: 0, autoCode: 0, autoName: 0, unmatched: 0, duplicate: 0, skipped: 0 };
  const f = await fundFor(weddingId, fundId, "manage");
  if (!f) return { ...empty, error: "Bạn không quản lý quỹ này." };
  if (!Array.isArray(rows) || rows.length > 5000) return { ...empty, error: "File quá lớn (tối đa 5.000 dòng)." };

  const sideGuests = await guestsOfFund(weddingId, f.fund.side);
  const allGuests = await db
    .select({ id: schema.guests.id, name: schema.guests.name, honorific: schema.guests.honorific, groupName: schema.guests.groupName, giftCode: schema.guests.giftCode })
    .from(schema.guests)
    .where(eq(schema.guests.weddingId, weddingId));
  const existingRefs = new Set(
    (await db.select({ txRef: schema.gifts.txRef }).from(schema.gifts).where(eq(schema.gifts.fundId, fundId))).map((r) => r.txRef).filter(Boolean),
  );

  const res = { ...empty };
  const toInsert: (typeof schema.gifts.$inferInsert)[] = [];
  const gifted = new Set<string>();
  for (const r of rows) {
    const amount = Math.round(Number(r.amount));
    const description = String(r.description ?? "").slice(0, 300);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.skipped++;
      continue;
    }
    const txRef = sha256(`${r.date}|${amount}|${description}`);
    if (existingRefs.has(txRef)) {
      res.duplicate++;
      continue;
    }
    existingRefs.add(txRef);
    // Mã khách là duy nhất trong cả đám cưới; khớp tên thì chỉ trong danh sách của quỹ.
    let m = matchTransfer(description, allGuests);
    if (m.status === "AUTO_NAME" || m.status === "UNMATCHED") m = matchTransfer(description, sideGuests.map((g) => ({ ...g, giftCode: "" })));
    const guestId = m.status === "UNMATCHED" ? null : m.guestId;
    if (m.status === "AUTO_CODE") res.autoCode++;
    else if (m.status === "AUTO_NAME") res.autoName++;
    else res.unmatched++;
    if (guestId) gifted.add(guestId);
    toInsert.push({
      id: newId(),
      weddingId,
      fundId,
      guestId,
      method: "CHUYEN_KHOAN",
      amount,
      rawText: description,
      matchStatus: m.status,
      txRef,
      receivedAt: String(r.date ?? "").slice(0, 20) || null,
      createdByMemberId: f.access.member.id,
      createdAt: new Date(),
    });
  }
  for (let i = 0; i < toInsert.length; i += 200) {
    await db.insert(schema.gifts).values(toInsert.slice(i, i + 200)).onConflictDoNothing();
  }
  for (const id of gifted) await markGuestGifted(id);
  res.imported = toInsert.length;
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return res;
}

/* --------------------------- Gán, sửa, xoá khoản --------------------------- */

export async function assignGiftAction(weddingId: string, giftId: string, guestId: string | "UNKNOWN") {
  const r = await giftFor(weddingId, giftId);
  if (!r) return;
  let name = "không rõ";
  if (guestId !== "UNKNOWN") {
    const [g] = await db.select({ id: schema.guests.id, name: schema.guests.name }).from(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.weddingId, weddingId)));
    if (!g) return;
    name = g.name;
  }
  await db
    .update(schema.gifts)
    .set({ guestId: guestId === "UNKNOWN" ? null : guestId, matchStatus: guestId === "UNKNOWN" ? "UNKNOWN" : "MANUAL" })
    .where(eq(schema.gifts.id, giftId));
  await db.insert(schema.giftEdits).values({ id: newId(), giftId, memberId: r.access.member.id, summary: `Gán cho: ${name}`, createdAt: new Date() });
  if (guestId !== "UNKNOWN") await markGuestGifted(guestId);
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function editGiftAction(weddingId: string, giftId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const r = await giftFor(weddingId, giftId);
  if (!r) return { error: "Bạn không quản lý khoản này." };
  const amount = Number(String(form.get("amount") ?? "").replace(/\D/g, "") || 0);
  const itemDesc = String(form.get("itemDesc") ?? "").trim().slice(0, 120) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  const changes: string[] = [];
  if (amount !== r.gift.amount) changes.push(`Số tiền: ${formatVnd(r.gift.amount)} → ${formatVnd(amount)}`);
  if (itemDesc !== r.gift.itemDesc) changes.push(`Hiện vật: ${r.gift.itemDesc ?? "—"} → ${itemDesc ?? "—"}`);
  if (note !== r.gift.note) changes.push("Sửa ghi chú");
  if (!changes.length) return { ok: "Không có gì thay đổi." };
  await db.update(schema.gifts).set({ amount, itemDesc, note }).where(eq(schema.gifts.id, giftId));
  await db.insert(schema.giftEdits).values({ id: newId(), giftId, memberId: r.access.member.id, summary: changes.join("; "), createdAt: new Date() });
  revalidatePath(`/cuoi/${weddingId}`, "layout");
  return { ok: "Đã lưu, có ghi lịch sử sửa." };
}

export async function deleteGiftAction(weddingId: string, giftId: string) {
  const r = await giftFor(weddingId, giftId);
  if (!r) return;
  await db.delete(schema.gifts).where(eq(schema.gifts.id, giftId));
  revalidatePath(`/cuoi/${weddingId}`, "layout");
}

export async function markThankedAction(weddingId: string, fundId: string, guestId: string) {
  const f = await fundFor(weddingId, fundId, "manage");
  if (!f) return;
  const [g] = await db.select({ id: schema.guests.id }).from(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.weddingId, weddingId)));
  if (!g) return;
  await db.update(schema.guests).set({ thankedAt: new Date() }).where(eq(schema.guests.id, guestId));
  revalidatePath(`/cuoi/${weddingId}/mung/cam-on`);
}

/* --------------------------------- Sổ đi --------------------------------- */

export async function addOutgoingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/so-di");
  const personName = titleCase(String(form.get("personName") ?? "")).slice(0, 80);
  const eventName = String(form.get("eventName") ?? "").trim().slice(0, 120) || "Đám cưới";
  const amount = Number(String(form.get("amount") ?? "").replace(/\D/g, "") || 0);
  const eventDate = String(form.get("eventDate") ?? "");
  if (!personName) return { error: "Nhập tên người nhận." };
  await db.insert(schema.outgoingGifts).values({
    id: newId(),
    userId: user.id,
    personName,
    eventName,
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? eventDate : null,
    amount,
    note: String(form.get("note") ?? "").trim().slice(0, 200) || null,
    createdAt: new Date(),
  });
  revalidatePath("/so-di");
  return { ok: "Đã lưu vào sổ đi." };
}

export async function deleteOutgoingAction(id: string) {
  const user = await requireUser("/so-di");
  await db.delete(schema.outgoingGifts).where(and(eq(schema.outgoingGifts.id, id), eq(schema.outgoingGifts.userId, user.id)));
  revalidatePath("/so-di");
}
