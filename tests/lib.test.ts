import { describe, expect, it } from "vitest";
import { parseGiftUtterance, parseStatementAmount, formatVnd } from "@/lib/vn-money";
import { solarToLunar, canChiOfYear, weddingDateNotes } from "@/lib/lunar";
import { buildVietQrPayload, crc16 } from "@/lib/vietqr";
import { matchTransfer, findGiftCode, suggestGuests } from "@/lib/matching";
import { normalizeVnPhone } from "@/lib/phone";

describe("đọc số tiền nói", () => {
  const cases: [string, number, string][] = [
    ["chú Hùng hàng xóm năm trăm", 500_000, "chú Hùng hàng xóm"],
    ["chú Sáu năm trăm", 500_000, "chú Sáu"],
    ["chú sáu năm trăm", 500_000, "chú sáu"],
    ["anh Nam 500k", 500_000, "anh Nam"],
    ["cô Lan 1tr2", 1_200_000, "cô Lan"],
    ["bác Ba một triệu", 1_000_000, "bác Ba"],
    ["chị Mai hai triệu rưỡi", 2_500_000, "chị Mai"],
    ["Tuấn đồng nghiệp hai trăm rưỡi", 250_000, "Tuấn đồng nghiệp"],
    ["em Linh ba trăm năm mươi nghìn", 350_000, "em Linh"],
    ["vợ chồng anh Đức một triệu năm trăm nghìn", 1_500_000, "vợ chồng anh Đức"],
    ["ông Tám 1.000.000 đồng", 1_000_000, "ông Tám"],
    ["dì Hoa gửi mười triệu", 10_000_000, "dì Hoa"],
    ["bạn Khoa một triệu hai", 1_200_000, "bạn Khoa"],
    ["cậu Bình 2 triệu", 2_000_000, "cậu Bình"],
  ];
  for (const [text, amount, name] of cases) {
    it(text, () => {
      const r = parseGiftUtterance(text);
      expect(r.amount).toBe(amount);
      expect(r.nameText).toBe(name);
    });
  }
  it("nhận hiện vật vàng", () => {
    const r = parseGiftUtterance("dì Hoa một chỉ vàng");
    expect(r.itemDesc).toBe("một chỉ vàng");
    expect(r.nameText).toBe("dì Hoa");
    expect(r.amount).toBe(0);
  });
  it("không có số tiền", () => {
    expect(parseGiftUtterance("chú Hùng").amount).toBe(0);
  });
  it("đọc ô số tiền sao kê", () => {
    expect(parseStatementAmount("1.500.000")).toBe(1_500_000);
    expect(parseStatementAmount("1,500,000.00")).toBe(1_500_000);
    expect(parseStatementAmount("+500000")).toBe(500_000);
    expect(parseStatementAmount("-200.000")).toBe(-200_000);
    expect(parseStatementAmount(750000)).toBe(750_000);
    expect(parseStatementAmount("")).toBeNull();
    expect(formatVnd(1500000)).toBe("1.500.000 đ");
  });
});

describe("âm lịch", () => {
  it("Tết các năm", () => {
    expect(solarToLunar(17, 2, 2026)).toEqual({ day: 1, month: 1, year: 2026, leap: false });
    expect(solarToLunar(29, 1, 2025)).toEqual({ day: 1, month: 1, year: 2025, leap: false });
    expect(solarToLunar(10, 2, 2024)).toEqual({ day: 1, month: 1, year: 2024, leap: false });
  });
  it("tháng nhuận 6 năm 2025", () => {
    expect(solarToLunar(25, 7, 2025)).toEqual({ day: 1, month: 6, year: 2025, leap: true });
  });
  it("can chi", () => {
    expect(canChiOfYear(2026)).toBe("Bính Ngọ");
    expect(canChiOfYear(2025)).toBe("Ất Tỵ");
  });
  it("cảnh báo tháng 7 âm", () => {
    // 15/8/2026 dương lịch nằm trong tháng 7 âm năm Bính Ngọ
    const notes = weddingDateNotes("2026-08-22");
    expect(notes.some((n) => n.text.includes("tháng 7 âm lịch"))).toBe(true);
  });
});

describe("VietQR", () => {
  it("CRC16 chuẩn", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
  it("cấu trúc chuỗi", () => {
    const p = buildVietQrPayload({ bin: "970436", accountNumber: "0011001234567", note: "MUNG ABC23 chuc mung" });
    expect(p.startsWith("000201010211")).toBe(true);
    expect(p).toContain("0010A000000727");
    expect(p).toContain("0006970436");
    expect(p).toContain("0208QRIBFTTA");
    expect(p).toContain("5303704");
    expect(p).toContain("5802VN");
    expect(p).toContain("MUNG ABC23 chuc mung");
    expect(p.slice(-8, -4)).toBe("6304");
    expect(crc16(p.slice(0, -4))).toBe(p.slice(-4));
  });
});

describe("đối soát", () => {
  const guests = [
    { id: "g1", name: "Nguyễn Văn Hùng", honorific: "chú", groupName: "Hàng xóm ở quê", giftCode: "AB2CD" },
    { id: "g2", name: "Trần Thị Lan", honorific: "cô", groupName: "Đồng nghiệp của mẹ", giftCode: "XY3ZK" },
    { id: "g3", name: "Lê Văn Hùng", honorific: "anh", groupName: "Bạn đại học", giftCode: "MN4PQ" },
  ];
  it("khớp theo mã", () => {
    expect(findGiftCode("MUNG AB2CD chuc mung hanh phuc", new Set(["AB2CD"]))).toBe("AB2CD");
    expect(matchTransfer("NGUYEN VAN A chuyen tien MUNGXY3ZK", guests)).toEqual({ status: "AUTO_CODE", guestId: "g2" });
  });
  it("khớp theo họ tên", () => {
    expect(matchTransfer("NGUYEN VAN HUNG chuyen tien mung cuoi", guests)).toEqual({ status: "AUTO_NAME", guestId: "g1" });
  });
  it("chỉ tên gọi thì để chờ xác nhận", () => {
    const r = matchTransfer("HUNG chuc mung", guests);
    expect(r.status).toBe("UNMATCHED");
  });
  it("gợi ý theo câu nói, ưu tiên đúng nhóm", () => {
    const s = suggestGuests("chú Hùng hàng xóm", guests);
    expect(s[0].guestId).toBe("g1");
  });
});

describe("số điện thoại", () => {
  it("chuẩn hoá", () => {
    expect(normalizeVnPhone("+84 912 345 678")).toBe("0912345678");
    expect(normalizeVnPhone("0912.345.678")).toBe("0912345678");
    expect(normalizeVnPhone("912345678")).toBe("0912345678");
    expect(normalizeVnPhone("12345")).toBeNull();
  });
});
