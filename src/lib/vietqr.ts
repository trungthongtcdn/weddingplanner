/**
 * Tạo chuỗi VietQR (chuẩn EMVCo của NAPAS) để chuyển khoản 24/7.
 * Tiền đi thẳng vào tài khoản của chủ quỹ — ứng dụng không giữ tiền.
 */

export type Bank = { bin: string; name: string };

/** Danh sách BIN theo api.vietqr.io (đối chiếu ngày 02/11/2026). */
export const BANKS: Bank[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970441", name: "VIB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970443", name: "SHB" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970433", name: "VietBank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "970424", name: "Shinhan Bank" },
  { bin: "970457", name: "Woori Bank" },
  { bin: "546034", name: "CAKE by VPBank" },
  { bin: "963388", name: "Timo" },
];

export function bankName(bin: string | null | undefined): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? "Ngân hàng";
}

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (đa thức 0x1021, giá trị đầu 0xFFFF). */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Nội dung chuyển khoản chỉ nên dùng chữ không dấu, số và khoảng trắng. */
export function sanitizeTransferNote(note: string): string {
  return note
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

export function buildVietQrPayload(opts: { bin: string; accountNumber: string; amount?: number; note?: string }): string {
  const beneficiary = field("00", opts.bin) + field("01", opts.accountNumber.replace(/\s/g, ""));
  const merchantInfo = field("00", "A000000727") + field("01", beneficiary) + field("02", "QRIBFTTA");
  let payload = field("00", "01") + field("01", opts.amount ? "12" : "11") + field("38", merchantInfo) + field("53", "704");
  if (opts.amount && opts.amount > 0) payload += field("54", String(Math.round(opts.amount)));
  payload += field("58", "VN");
  const note = opts.note ? sanitizeTransferNote(opts.note) : "";
  if (note) payload += field("62", field("08", note));
  payload += "6304";
  return payload + crc16(payload);
}

/** Nội dung chuyển khoản gắn với khách: "MUNG ABC12 …". */
export function giftTransferNote(giftCode: string, wish?: string): string {
  return sanitizeTransferNote(`MUNG ${giftCode}${wish ? " " + wish : ""}`);
}
