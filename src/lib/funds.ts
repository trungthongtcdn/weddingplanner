import "server-only";
import { visibleFunds, type WeddingAccess } from "@/lib/access";

export const FUND_LABEL = { CAP_DOI: "Quỹ cặp đôi", NHA_TRAI: "Quỹ nhà trai", NHA_GAI: "Quỹ nhà gái" } as const;

/** Các quỹ người dùng được xem và quỹ đang chọn theo ?quy=. */
export async function resolveFunds(access: WeddingAccess, quy: unknown) {
  const funds = await visibleFunds(access);
  const current = funds.find((f) => f.fund.id === quy) ?? funds[0] ?? null;
  return { funds, current };
}
