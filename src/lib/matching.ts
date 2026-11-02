import { normalizeForMatch, stripDiacritics, tokens } from "./text";

export type MatchableGuest = {
  id: string;
  name: string;
  honorific?: string | null;
  groupName?: string | null;
  giftCode: string;
};

export type Suggestion = { guestId: string; score: number; reason: string };

const HONORIFICS = new Set(
  ["ong", "ba", "bac", "chu", "co", "di", "cau", "mo", "thim", "duong", "anh", "chi", "em", "ban", "chau", "thay", "cu", "sep", "vo chong", "gia dinh"].map(
    (s) => s,
  ),
);

/** Tìm mã khách "MUNG XXXXX" trong nội dung chuyển khoản. */
export function findGiftCode(description: string, knownCodes: Set<string>): string | null {
  const compact = stripDiacritics(description).toUpperCase().replace(/[^A-Z0-9]/g, "");
  let from = 0;
  while (true) {
    const idx = compact.indexOf("MUNG", from);
    if (idx < 0) break;
    const candidate = compact.slice(idx + 4, idx + 9);
    if (knownCodes.has(candidate)) return candidate;
    from = idx + 4;
  }
  return null;
}

function containsSequence(hay: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Chấm điểm mức độ một câu (nội dung chuyển khoản hoặc câu nhập phong bì) chỉ tới một khách.
 * 1.0 = trùng nguyên họ tên; tên gọi + nhóm quan hệ cũng cho điểm khá.
 */
export function scoreGuest(text: string, guest: MatchableGuest): Suggestion {
  const hay = tokens(text);
  const nameToks = tokens(guest.name);
  let score = 0;
  let reason = "";
  if (nameToks.length >= 2 && containsSequence(hay, nameToks)) {
    score = 1;
    reason = "trùng họ tên";
  } else if (nameToks.length >= 2 && nameToks.every((t) => hay.includes(t))) {
    score = 0.9;
    reason = "đủ các chữ trong họ tên";
  } else {
    const given = nameToks[nameToks.length - 1];
    if (given && hay.includes(given)) {
      score = 0.5;
      reason = "trùng tên gọi";
      // Thêm điểm nếu có cả chữ đệm đứng ngay trước tên gọi ("Văn Hùng")
      if (nameToks.length >= 2 && containsSequence(hay, nameToks.slice(-2))) {
        score = 0.7;
        reason = "trùng tên đệm và tên gọi";
      }
    }
  }
  if (score > 0) {
    if (guest.honorific) {
      const h = normalizeForMatch(guest.honorific);
      if (h && containsSequence(hay, h.split(" "))) {
        score += 0.1;
        reason += ", đúng xưng hô";
      }
    }
    if (guest.groupName) {
      const groupToks = tokens(guest.groupName).filter((t) => !HONORIFICS.has(t) && t.length > 1);
      const overlap = groupToks.filter((t) => hay.includes(t)).length;
      if (groupToks.length && overlap / groupToks.length >= 0.5) {
        score += 0.2;
        reason += ", đúng nhóm";
      }
    }
  }
  return { guestId: guest.id, score: Math.min(score, 1.2), reason };
}

export function suggestGuests(text: string, guests: MatchableGuest[], limit = 3): Suggestion[] {
  return guests
    .map((g) => scoreGuest(text, g))
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type MatchResult =
  | { status: "AUTO_CODE"; guestId: string }
  | { status: "AUTO_NAME"; guestId: string }
  | { status: "UNMATCHED"; suggestions: Suggestion[] };

/**
 * Khớp một dòng chuyển khoản: theo mã khách trước, rồi theo họ tên.
 * Chỉ tự gán theo tên khi có đúng một khách khớp gần như trọn họ tên.
 */
export function matchTransfer(description: string, guests: MatchableGuest[]): MatchResult {
  const codes = new Map(guests.map((g) => [g.giftCode, g.id]));
  const code = findGiftCode(description, new Set(codes.keys()));
  if (code) return { status: "AUTO_CODE", guestId: codes.get(code)! };
  const all = guests.map((g) => scoreGuest(description, g)).filter((s) => s.score >= 0.5).sort((a, b) => b.score - a.score);
  const strong = all.filter((s) => s.score >= 0.9);
  if (strong.length === 1) return { status: "AUTO_NAME", guestId: strong[0].guestId };
  return { status: "UNMATCHED", suggestions: all.slice(0, 3) };
}

/** Tìm khách trùng số điện thoại (đã chuẩn hoá) giữa các danh sách. */
export function findDuplicatePhones<T extends { id: string; phone: string | null }>(list: T[]): Map<string, T[]> {
  const byPhone = new Map<string, T[]>();
  for (const g of list) {
    if (!g.phone) continue;
    const arr = byPhone.get(g.phone) ?? [];
    arr.push(g);
    byPhone.set(g.phone, arr);
  }
  for (const [k, v] of byPhone) if (v.length < 2) byPhone.delete(k);
  return byPhone;
}
