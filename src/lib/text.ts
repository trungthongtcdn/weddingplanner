/** Bỏ dấu tiếng Việt: "Nguyễn Văn Hùng" → "Nguyen Van Hung". */
export function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Chuẩn hoá để so khớp: bỏ dấu, chữ thường, chỉ giữ chữ và số, gộp khoảng trắng. */
export function normalizeForMatch(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(input: string): string[] {
  const n = normalizeForMatch(input);
  return n ? n.split(" ") : [];
}

/** Mỗi từ trong câu tìm phải là đầu của một từ trong chuỗi ("ng v an" khớp "Nguyễn Văn An", "an" không khớp "Hằng"). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = tokens(query);
  if (!q.length) return true;
  const h = tokens(haystack);
  return q.every((t) => h.some((w) => w.startsWith(t)));
}

/** Lấy tên gọi (chữ cuối) — người Việt thường gọi nhau bằng tên này. */
export function givenName(fullName: string): string {
  const t = fullName.trim().split(/\s+/);
  return t[t.length - 1] ?? "";
}

/** Viết hoa chữ cái đầu mỗi từ. */
export function titleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("vi") + w.slice(1) : w))
    .join(" ");
}
