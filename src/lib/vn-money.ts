/**
 * Định dạng và đọc số tiền kiểu nói của người Việt.
 *
 * Quy ước: số không kèm đơn vị và nhỏ hơn 10.000 được hiểu là nghìn đồng
 * ("năm trăm" → 500.000 đ, "500" → 500.000 đ), vì tiền mừng hiếm khi lẻ dưới nghìn.
 */

export function formatVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const s = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${s} đ`;
}

/** 500000 → "500 nghìn", 1500000 → "1,5 triệu". */
export function formatVndShort(amount: number): string {
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return `${trimDecimal(v)} triệu`;
  }
  if (amount >= 1_000) return `${trimDecimal(amount / 1_000)} nghìn`;
  return formatVnd(amount);
}

function trimDecimal(v: number): string {
  return (Math.round(v * 10) / 10).toString().replace(".", ",");
}

/* ------------------------------------------------------------------------- */

const DIGIT_WORDS: Record<string, number> = {
  không: 0,
  một: 1,
  mốt: 1,
  hai: 2,
  ba: 3,
  bốn: 4,
  tư: 4,
  năm: 5,
  lăm: 5,
  nhăm: 5,
  sáu: 6,
  bảy: 7,
  bẩy: 7,
  tám: 8,
  chín: 9,
  // Dạng không dấu (gõ phím) — chỉ những từ ít nhầm với tên riêng.
  mot: 1,
  bon: 4,
  bay: 7,
  chin: 9,
};

type Unit = "mươi" | "mười" | "trăm" | "nghìn" | "triệu" | "tỷ" | "rưỡi" | "lẻ";

const UNIT_WORDS: Record<string, Unit> = {
  mươi: "mươi",
  muoi: "mươi",
  mười: "mười",
  trăm: "trăm",
  tram: "trăm",
  nghìn: "nghìn",
  ngàn: "nghìn",
  nghin: "nghìn",
  ngan: "nghìn",
  k: "nghìn",
  n: "nghìn",
  triệu: "triệu",
  trieu: "triệu",
  tr: "triệu",
  củ: "triệu",
  tỷ: "tỷ",
  tỉ: "tỷ",
  ty: "tỷ",
  rưỡi: "rưỡi",
  ruoi: "rưỡi",
  lẻ: "lẻ",
  linh: "lẻ",
};

/** Các từ đuôi không mang nghĩa số tiền, bỏ qua khi đọc từ cuối câu. */
const TRAILING_FILLERS = new Set(["đồng", "đ", "vnđ", "vnd", "nhé", "nha", "ạ", "à", "chẵn", "thôi"]);

/** Từ nối giữa tên và số tiền: "chú Hùng gửi năm trăm". */
const NAME_FILLERS = new Set(["gửi", "mừng", "mừng cưới", "được", "là", "cho", "đi", "góp", "phong", "bì", "phong bì"]);

const ITEM_WORDS = ["vàng", "nhẫn", "dây chuyền", "bông tai", "lắc", "kiềng", "đồng hồ", "quà"];

type Tok = { raw: string; low: string; kind: "num" | "digit" | "unit" | "other"; value?: number; unit?: Unit };

function splitTokens(text: string): Tok[] {
  const out: Tok[] = [];
  const parts = text.normalize("NFC").split(/\s+/).filter(Boolean);
  for (const part of parts) {
    // Tách "1tr2", "500k", "1.5tr" thành các mảnh số / chữ.
    const pieces = part.match(/\d+(?:[.,]\d+)*|[^\d\s.,]+/g) ?? [];
    for (const raw of pieces) {
      const low = raw.toLocaleLowerCase("vi").replace(/[.,!?;:]+$/g, "");
      if (!low) continue;
      if (/^\d/.test(low)) {
        out.push({ raw, low, kind: "num", value: parseNumeric(low) });
      } else if (low in DIGIT_WORDS) {
        out.push({ raw, low, kind: "digit", value: DIGIT_WORDS[low] });
      } else if (low in UNIT_WORDS) {
        out.push({ raw, low, kind: "unit", unit: UNIT_WORDS[low] });
      } else {
        out.push({ raw, low, kind: "other" });
      }
    }
  }
  return out;
}

function parseNumeric(s: string): number {
  // 1.500.000 hoặc 1,500,000 → dấu phân cách hàng nghìn
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  // 1,5 hoặc 1.5 → số thập phân
  return Number(s.replace(",", "."));
}

const MAGNITUDE_UNITS = new Set<Unit>(["mươi", "trăm", "nghìn", "triệu", "tỷ"]);

/**
 * Tìm đoạn số tiền ở cuối câu.
 * Một chữ số (một, hai, năm…) chỉ được tính là một phần của số tiền khi ngay sau nó là
 * đơn vị (mươi, trăm, nghìn, triệu), hoặc khi nó là chữ cuối cùng đứng sau một đơn vị lớn
 * ("một triệu hai"). Nhờ vậy "chú Sáu năm trăm" vẫn hiểu là chú Sáu, 500.000 đ.
 */
function findAmountSuffix(toks: Tok[]): number {
  let end = toks.length;
  while (end > 0 && TRAILING_FILLERS.has(toks[end - 1].low)) end--;
  let start = end;
  for (let i = end - 1; i >= 0; i--) {
    const t = toks[i];
    const next = toks[i + 1];
    const isLast = i === end - 1;
    if (t.kind === "num") {
      start = i;
      continue;
    }
    if (t.kind === "unit") {
      if (t.unit === "rưỡi" && !(i > 0 && (toks[i - 1].kind === "unit" || toks[i - 1].kind === "num"))) break;
      // "lẻ/linh" chỉ là số khi kẹp giữa đơn vị và chữ số ("một trăm linh năm"); còn lại thường là tên (Linh).
      if (t.unit === "lẻ" && !(i > 0 && toks[i - 1].kind === "unit" && next && (next.kind === "digit" || next.kind === "num"))) break;
      start = i;
      continue;
    }
    if (t.kind === "digit") {
      const capitalized = i > 0 && t.raw[0] !== t.raw[0].toLocaleLowerCase("vi");
      if (capitalized) break; // "chú Sáu", "anh Tám" là tên riêng
      const followedByUnit = next && i + 1 < end && next.kind === "unit" && next.unit !== "rưỡi" && next.unit !== "lẻ";
      const trailingAfterMagnitude =
        isLast && i > 0 && toks[i - 1].kind === "unit" && (toks[i - 1].unit === "triệu" || toks[i - 1].unit === "nghìn" || toks[i - 1].unit === "trăm");
      const colloquialPair = next && i + 1 < end && next.kind === "digit" && i + 2 === end && i > 0 && toks[i - 1].kind === "unit";
      if (followedByUnit || trailingAfterMagnitude || colloquialPair) {
        start = i;
        continue;
      }
      break;
    }
    break;
  }
  // Phải có ít nhất một con số hoặc một đơn vị tiền mới coi là số tiền.
  const slice = toks.slice(start, end);
  const hasNumber = slice.some((t) => t.kind === "num" || t.kind === "digit" || t.unit === "mười");
  return hasNumber ? start : toks.length;
}

function evaluate(toks: Tok[]): number | null {
  if (!toks.length) return null;
  let total = 0;
  let group = 0;
  let pending: number | null = null;
  let lastMagnitude: number | null = null; // 1e3, 1e6, 1e9
  let lastUnit: Unit | null = null;
  let sawMagnitude = false;

  const flushMagnitude = (mult: number) => {
    if (pending !== null) {
      group += pending;
      pending = null;
    }
    total += (group || 1) * mult;
    group = 0;
    lastMagnitude = mult;
    sawMagnitude = true;
  };

  for (const t of toks) {
    if (t.kind === "num" || t.kind === "digit") {
      if (pending !== null) {
        // "hai lăm" → 25
        group += pending * 10;
      }
      pending = t.value ?? 0;
      continue;
    }
    if (t.kind !== "unit") continue;
    switch (t.unit) {
      case "mươi":
        group += (pending ?? 1) * 10;
        pending = null;
        break;
      case "mười":
        group += 10;
        pending = null;
        break;
      case "trăm":
        group += (pending ?? 1) * 100;
        pending = null;
        break;
      case "nghìn":
        flushMagnitude(1_000);
        break;
      case "triệu":
        flushMagnitude(1_000_000);
        break;
      case "tỷ":
        flushMagnitude(1_000_000_000);
        break;
      case "rưỡi":
        if (lastUnit === "trăm") group += 50;
        else if (lastMagnitude) total += lastMagnitude / 2;
        break;
      case "lẻ":
        break;
    }
    if (t.unit !== "rưỡi" && t.unit !== "lẻ") lastUnit = t.unit ?? null;
  }

  if (pending !== null) {
    if (lastUnit === "triệu" || lastUnit === "nghìn" || lastUnit === "tỷ") {
      // "một triệu hai" → 1.200.000, "hai trăm nghìn năm" hiếm gặp nhưng xử lý tương tự
      total += pending * ((lastMagnitude ?? 10) / 10);
    } else if (lastUnit === "trăm") {
      group += pending * 10; // "ba trăm hai" → 320
    } else {
      group += pending;
    }
  }
  total += group;
  if (!sawMagnitude && total > 0 && total < 10_000) total *= 1_000;
  return Math.round(total);
}

export type ParsedEntry = {
  amount: number;
  /** Phần còn lại sau khi bỏ số tiền — thường là tên và mối quan hệ. */
  nameText: string;
  itemDesc: string | null;
};

/** Đọc một câu như "chú Hùng hàng xóm năm trăm" thành tên + số tiền. */
export function parseGiftUtterance(text: string): ParsedEntry {
  const clean = text.trim();
  const lower = clean.toLocaleLowerCase("vi");
  const item = ITEM_WORDS.find((w) => lower.includes(w));
  const toks = splitTokens(clean);

  const itemIdx = item && item !== "quà" ? toks.findIndex((t) => item.split(" ")[0] === t.low) : -1;
  if (itemIdx >= 0) {
    // Hiện vật: lấy cụm từ con số đứng trước từ khoá đến hết làm mô tả.
    let start = itemIdx;
    while (start > 0 && (toks[start - 1].kind !== "other" || ["chỉ", "cây", "lượng", "cặp", "đôi", "chiếc"].includes(toks[start - 1].low))) start--;
    const desc = toks.slice(start).map((t) => t.raw).join(" ");
    return { amount: 0, nameText: cleanName(toks.slice(0, start)), itemDesc: desc };
  }

  const start = findAmountSuffix(toks);
  const amount = evaluate(toks.slice(start)) ?? 0;
  return { amount, nameText: cleanName(toks.slice(0, start)), itemDesc: null };
}

function cleanName(toks: Tok[]): string {
  const words = toks.map((t) => t.raw);
  while (words.length && NAME_FILLERS.has(words[words.length - 1].toLocaleLowerCase("vi"))) words.pop();
  return words.join(" ").replace(/[,.:;-]+$/g, "").trim();
}

/** Đọc ô số tiền trong sao kê: "1.500.000", "1,500,000.00", "+500000", "500.000 VND". */
export function parseStatementAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,\-+]/g, "");
  if (!s) return null;
  const negative = s.startsWith("-");
  s = s.replace(/[+-]/g, "");
  // Bỏ phần thập phân ",00" hoặc ".00" ở cuối
  s = s.replace(/[.,]\d{1,2}$/, "");
  const n = Number(s.replace(/[.,]/g, ""));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}
