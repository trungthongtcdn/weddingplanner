import type { Side } from "./db/schema";

export type RecallGroup = { name: string; prompt: string };

/** Gợi nhớ khách theo nhóm quan hệ — mỗi nhóm kèm một câu nhắc để không bỏ sót. */
export const RECALL_GROUPS: Record<"COUPLE" | "PARENT", RecallGroup[]> = {
  COUPLE: [
    { name: "Họ nội", prompt: "Các bác, chú, cô, anh chị em họ bên nội. Đừng quên các cụ cao tuổi." },
    { name: "Họ ngoại", prompt: "Các bác, cậu, dì, anh chị em họ bên ngoại." },
    { name: "Hàng xóm ở quê", prompt: "Những nhà gần nhà ở quê, nhà hay qua lại giúp đỡ." },
    { name: "Hàng xóm nơi đang sống", prompt: "Hàng xóm cùng tầng, cùng ngõ, ban quản trị khu nhà." },
    { name: "Bạn cấp 1", prompt: "Bạn cùng lớp tiểu học còn giữ liên lạc, cả thầy cô chủ nhiệm." },
    { name: "Bạn cấp 2", prompt: "Lớp trưởng thường có danh sách cả lớp." },
    { name: "Bạn cấp 3", prompt: "Bạn thân, bạn cùng bàn, thầy cô chủ nhiệm." },
    { name: "Bạn đại học", prompt: "Bạn cùng lớp, cùng phòng ký túc, câu lạc bộ." },
    { name: "Đồng nghiệp hiện tại", prompt: "Cùng nhóm, quản lý trực tiếp, các phòng ban hay làm việc chung." },
    { name: "Đồng nghiệp cũ", prompt: "Công ty cũ, sếp cũ còn giữ liên lạc." },
    { name: "Đối tác, khách hàng", prompt: "Những người đã giúp đỡ trong công việc." },
    { name: "Bạn bè khác", prompt: "Bạn chơi thể thao, nhóm đi phượt, hội đồng hương…" },
  ],
  PARENT: [
    { name: "Họ hàng", prompt: "Anh chị em ruột, anh chị em họ của bố mẹ và gia đình họ." },
    { name: "Hàng xóm", prompt: "Những nhà gần nhà, tổ dân phố." },
    { name: "Bạn bè của bố mẹ", prompt: "Bạn học cũ, bạn thân lâu năm." },
    { name: "Đồng nghiệp của bố mẹ", prompt: "Cơ quan hiện tại, cả những người đã nghỉ hưu cùng đơn vị." },
    { name: "Hội nhóm", prompt: "Hội đồng hương, hội cựu chiến binh, hội phụ nữ, câu lạc bộ…" },
    { name: "Thông gia, người quen khác", prompt: "Những người từng mời gia đình mình dự cưới." },
  ],
};

export function recallGroupsFor(side: Side): RecallGroup[] {
  return side === "CAP_DOI" ? RECALL_GROUPS.COUPLE : RECALL_GROUPS.PARENT;
}

const HONORIFICS = ["ông bà", "vợ chồng", "gia đình", "ông", "bà", "bác", "chú", "cô", "dì", "cậu", "mợ", "thím", "dượng", "anh", "chị", "em", "bạn", "thầy", "cháu"];

export type ParsedGuestLine = { name: string; honorific: string | null; phone: string | null; rawPhone: string | null };

/**
 * Đọc một dòng nhập nhanh: "chú Hùng, 0912 345 678", "Nguyễn Văn An - 0987654321", "cô Lan".
 */
export function parseGuestLine(line: string): ParsedGuestLine | null {
  let rest = line.trim();
  if (!rest) return null;
  const phoneMatch = rest.match(/(\+?\d[\d .\-]{7,}\d)/);
  let rawPhone: string | null = null;
  if (phoneMatch) {
    rawPhone = phoneMatch[1];
    rest = (rest.slice(0, phoneMatch.index) + rest.slice((phoneMatch.index ?? 0) + phoneMatch[1].length)).trim();
  }
  rest = rest.replace(/^[,\-–:;.\s]+|[,\-–:;.\s]+$/g, "").replace(/\s+/g, " ");
  if (!rest) return null;
  let honorific: string | null = null;
  const lower = rest.toLocaleLowerCase("vi");
  for (const h of HONORIFICS) {
    if (lower.startsWith(h + " ") && rest.length > h.length + 1) {
      honorific = h;
      rest = rest.slice(h.length + 1).trim();
      break;
    }
  }
  const name = rest
    .split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("vi") + w.slice(1) : w))
    .join(" ");
  const digits = rawPhone?.replace(/\D/g, "") ?? null;
  return { name, honorific, phone: digits, rawPhone };
}
