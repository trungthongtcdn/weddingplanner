import { normalizeForMatch } from "./text";
import { parseStatementAmount } from "./vn-money";

export type ColumnGuess = { headerRow: number; date: number; amount: number; description: number };

const DESC = ["noi dung", "mo ta", "dien giai", "description", "chi tiet", "remark", "details", "transaction detail"];
const CREDIT = ["ghi co", "so tien ghi co", "credit", "tien vao", "phat sinh co", "so tien co", "co"];
const AMOUNT = ["so tien", "amount", "gia tri"];
const DATE = ["ngay", "date", "thoi gian", "ngay giao dich", "transaction date"];

function findCol(header: string[], keys: string[]): number {
  for (const k of keys) {
    const i = header.findIndex((h) => h === k);
    if (i >= 0) return i;
  }
  for (const k of keys) {
    if (k.length < 3) continue;
    const i = header.findIndex((h) => h.includes(k));
    if (i >= 0) return i;
  }
  return -1;
}

/** Đoán dòng tiêu đề và các cột ngày / số tiền vào / nội dung trong sao kê ngân hàng. */
export function guessColumns(rows: string[][]): ColumnGuess {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const header = rows[r].map((c) => normalizeForMatch(c));
    const description = findCol(header, DESC);
    if (description < 0) continue;
    let amount = findCol(header, CREDIT);
    if (amount < 0) amount = findCol(header, AMOUNT);
    const date = findCol(header, DATE);
    if (amount >= 0) return { headerRow: r, date, amount, description };
  }
  return { headerRow: 0, date: -1, amount: -1, description: -1 };
}

export function extractRows(rows: string[][], g: ColumnGuess) {
  return rows
    .slice(g.headerRow + 1)
    .map((r) => ({
      date: g.date >= 0 ? (r[g.date] ?? "") : "",
      amount: g.amount >= 0 ? (parseStatementAmount(r[g.amount] ?? "") ?? 0) : 0,
      description: g.description >= 0 ? (r[g.description] ?? "") : "",
    }))
    .filter((r) => r.amount > 0 && r.description);
}
