import Papa from "papaparse";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";

/** Đọc file sao kê (CSV/XLSX) thành bảng chữ; không lưu file lại. */
export async function POST(req: Request) {
  if (!(await getCurrentUser())) return Response.json({ error: "Cần đăng nhập." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Chưa chọn file." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "File lớn hơn 5 MB." }, { status: 400 });
  const name = file.name.toLowerCase();
  let rows: string[][] = [];
  try {
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = new TextDecoder("utf-8").decode(await file.arrayBuffer()).replace(/^﻿/, "");
      rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data.map((r) => r.map((c) => String(c ?? "").trim()));
    } else if (name.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
      const ws = wb.worksheets[0];
      ws?.eachRow({ includeEmpty: false }, (row) => {
        const vals = (row.values as unknown[]).slice(1).map((v) => cellText(v));
        if (vals.some((v) => v)) rows.push(vals);
      });
    } else {
      return Response.json({ error: "Chỉ nhận file .xlsx hoặc .csv. File .xls cũ: mở bằng Excel rồi lưu lại dạng .xlsx." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Không đọc được file. Thử tải lại sao kê từ ngân hàng." }, { status: 400 });
  }
  return Response.json({ rows: rows.slice(0, 5100) });
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return String(o.text);
    if (o.result !== undefined) return cellText(o.result);
    return "";
  }
  return String(v).trim();
}
