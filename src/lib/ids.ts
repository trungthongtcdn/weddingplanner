import { randomBytes, randomInt, createHash } from "node:crypto";

export function newId(): string {
  return randomBytes(12).toString("base64url");
}

export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Bảng chữ không có các ký tự dễ nhầm (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Mã khách 5 ký tự, dùng trong nội dung chuyển khoản. */
export function newGiftCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
