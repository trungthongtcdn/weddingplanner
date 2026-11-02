import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import type { MemberRole, Side } from "@/lib/db/schema";

export type Wedding = typeof schema.weddings.$inferSelect;
export type Member = typeof schema.members.$inferSelect;
export type Fund = typeof schema.funds.$inferSelect;

export type WeddingAccess = { user: CurrentUser; member: Member; wedding: Wedding };

/** Kiểm tra người dùng là thành viên của đám cưới; không phải thì trả 404. */
export const getWeddingAccess = cache(async (weddingId: string): Promise<WeddingAccess> => {
  const user = await requireUser(`/cuoi/${weddingId}`);
  const [row] = await db
    .select({ member: schema.members, wedding: schema.weddings })
    .from(schema.members)
    .innerJoin(schema.weddings, eq(schema.members.weddingId, schema.weddings.id))
    .where(and(eq(schema.members.weddingId, weddingId), eq(schema.members.userId, user.id)))
    .limit(1);
  if (!row) notFound();
  return { user, member: row.member, wedding: row.wedding };
});

export const ROLE_LABEL: Record<MemberRole, string> = {
  COUPLE: "Cô dâu / chú rể",
  PARENT_GROOM: "Bố mẹ nhà trai",
  PARENT_BRIDE: "Bố mẹ nhà gái",
  HELPER: "Người hỗ trợ",
};

export const SIDE_LABEL: Record<Side, string> = {
  CAP_DOI: "Cặp đôi",
  NHA_TRAI: "Nhà trai",
  NHA_GAI: "Nhà gái",
};

const PARENT_ROLE_OF_SIDE: Partial<Record<Side, MemberRole>> = { NHA_TRAI: "PARENT_GROOM", NHA_GAI: "PARENT_BRIDE" };

/** Danh sách khách mà thành viên được xem và sửa. */
export function guestSidesFor(role: MemberRole): Side[] {
  switch (role) {
    case "COUPLE":
      return ["CAP_DOI", "NHA_TRAI", "NHA_GAI"];
    case "PARENT_GROOM":
      return ["NHA_TRAI"];
    case "PARENT_BRIDE":
      return ["NHA_GAI"];
    default:
      return [];
  }
}

export function canSeeGuests(role: MemberRole) {
  return role !== "HELPER";
}
export function canSeeBudget(role: MemberRole) {
  return role !== "HELPER";
}
export function canManageWedding(role: MemberRole) {
  return role === "COUPLE";
}

/**
 * Quyền với một quỹ mừng.
 * - Quỹ cặp đôi: chỉ cô dâu chú rể.
 * - Quỹ nhà trai/nhà gái: bố mẹ bên đó là chủ. Khi bên đó chưa có bố mẹ tham gia,
 *   cặp đôi tạm quản lý. Bố mẹ có thể tắt quyền xem của cặp đôi.
 */
export function fundPermission(
  role: MemberRole,
  fund: Fund,
  parentJoined: Record<Side, boolean>,
): { view: boolean; manage: boolean } {
  if (fund.side === "CAP_DOI") return { view: role === "COUPLE", manage: role === "COUPLE" };
  const ownerRole = PARENT_ROLE_OF_SIDE[fund.side];
  if (role === ownerRole) return { view: true, manage: true };
  if (role === "COUPLE") {
    if (!parentJoined[fund.side]) return { view: true, manage: true };
    return { view: fund.coupleCanView, manage: false };
  }
  return { view: false, manage: false };
}

export async function parentJoinedMap(weddingId: string): Promise<Record<Side, boolean>> {
  const rows = await db.select({ role: schema.members.role }).from(schema.members).where(eq(schema.members.weddingId, weddingId));
  return {
    CAP_DOI: true,
    NHA_TRAI: rows.some((r) => r.role === "PARENT_GROOM"),
    NHA_GAI: rows.some((r) => r.role === "PARENT_BRIDE"),
  };
}

/** Các quỹ thành viên được xem, kèm quyền quản lý. */
export async function visibleFunds(access: WeddingAccess) {
  const all = await db.select().from(schema.funds).where(eq(schema.funds.weddingId, access.wedding.id));
  const joined = await parentJoinedMap(access.wedding.id);
  return all
    .map((fund) => ({ fund, perm: fundPermission(access.member.role, fund, joined) }))
    .filter((f) => f.perm.view)
    .sort((a, b) => ["CAP_DOI", "NHA_TRAI", "NHA_GAI"].indexOf(a.fund.side) - ["CAP_DOI", "NHA_TRAI", "NHA_GAI"].indexOf(b.fund.side));
}
