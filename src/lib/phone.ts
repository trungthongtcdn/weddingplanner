/**
 * Chuẩn hoá số điện thoại Việt Nam về dạng 0xxxxxxxxx (10 chữ số).
 * Trả về null nếu không hợp lệ.
 */
export function normalizeVnPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0084")) digits = digits.slice(4);
  else if (digits.startsWith("84") && digits.length === 11) digits = digits.slice(2);
  if (digits.length === 9 && !digits.startsWith("0")) digits = "0" + digits;
  if (!/^0\d{9}$/.test(digits)) return null;
  return digits;
}

/** 0912345678 → "0912 345 678" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  if (!/^0\d{9}$/.test(phone)) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}

/** Link mở khung chat Zalo theo số điện thoại. */
export function zaloChatUrl(phone: string): string {
  return `https://zalo.me/${phone}`;
}
