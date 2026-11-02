"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importStatementAction, type ImportResult } from "@/app/actions/gifts";
import { guessColumns, extractRows, type ColumnGuess } from "@/lib/statement";
import { formatVnd } from "@/lib/vn-money";

export function StatementImport({ weddingId, fundId }: { weddingId: string; fundId: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [cols, setCols] = useState<ColumnGuess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/sao-ke", { method: "POST", body: fd });
    const data = (await res.json()) as { rows?: string[][]; error?: string };
    setLoading(false);
    if (!res.ok || !data.rows) {
      setError(data.error ?? "Không đọc được file.");
      return;
    }
    setRows(data.rows);
    setCols(guessColumns(data.rows));
  }

  const extracted = useMemo(() => (rows && cols ? extractRows(rows, cols) : []), [rows, cols]);
  const header = rows && cols ? rows[cols.headerRow] ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="panel px-4 py-4">
        <label className="label" htmlFor="file">
          File sao kê tài khoản nhận mừng
        </label>
        <input
          id="file"
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-[0.93rem] file:mr-3 file:rounded-lg file:border-0 file:bg-son-tint file:px-3.5 file:py-2.5 file:font-semibold file:text-son-dark"
        />
        <p className="hint">Tải sao kê dạng Excel (.xlsx) hoặc .csv từ ứng dụng ngân hàng. File chỉ được đọc để lấy các khoản tiền vào, không được lưu lại.</p>
        {loading ? <p className="mt-2 text-muted">Đang đọc file…</p> : null}
        {error ? <p className="mt-2 font-medium text-son">{error}</p> : null}
      </div>

      {rows && cols ? (
        <div className="panel space-y-3 px-4 py-4">
          <p className="font-semibold">Kiểm tra các cột</p>
          {(
            [
              ["description", "Nội dung chuyển khoản"],
              ["amount", "Số tiền vào (ghi có)"],
              ["date", "Ngày giao dịch"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={`col-${key}`}>
                {label}
              </label>
              <select id={`col-${key}`} className="field" value={cols[key]} onChange={(e) => setCols({ ...cols, [key]: Number(e.target.value) })}>
                <option value={-1}>— Không có —</option>
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    Cột {i + 1}: {h || "(trống)"}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label className="label" htmlFor="headerRow">
              Dòng tiêu đề
            </label>
            <select id="headerRow" className="field" value={cols.headerRow} onChange={(e) => setCols({ ...cols, headerRow: Number(e.target.value) })}>
              {rows.slice(0, 30).map((r, i) => (
                <option key={i} value={i}>
                  Dòng {i + 1}: {r.filter(Boolean).slice(0, 3).join(" | ").slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[0.93rem]">
            Tìm thấy <strong>{extracted.length}</strong> khoản tiền vào, tổng <strong>{formatVnd(extracted.reduce((s, r) => s + r.amount, 0))}</strong>.
          </p>
          {extracted.length ? (
            <ul className="rows max-h-64 overflow-y-auto rounded-xl border border-line text-[0.85rem]">
              {extracted.slice(0, 30).map((r, i) => (
                <li key={i} className="flex justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-muted">{r.description}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatVnd(r.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            disabled={!extracted.length || pending}
            onClick={() =>
              start(async () => {
                setResult(await importStatementAction(weddingId, fundId, extracted));
                setRows(null);
              })
            }
            className="btn-primary w-full"
          >
            {pending ? "Đang nhập và đối soát…" : `Nhập ${extracted.length} khoản`}
          </button>
          <p className="hint">Nhập lại cùng một file sẽ không bị trùng.</p>
        </div>
      ) : null}

      {result ? (
        <div className={`rounded-xl border px-4 py-3.5 ${result.error ? "border-son/30 bg-son-tint" : "border-moss/25 bg-moss-tint"}`}>
          {result.error ? (
            result.error
          ) : (
            <>
              <p className="font-semibold">Đã nhập {result.imported} khoản.</p>
              <ul className="mt-1 text-[0.93rem]">
                <li>Khớp theo mã khách: {result.autoCode}</li>
                <li>Khớp theo họ tên: {result.autoName}</li>
                <li>Cần xác nhận: {result.unmatched}</li>
                {result.duplicate ? <li>Đã có từ trước, bỏ qua: {result.duplicate}</li> : null}
              </ul>
              {result.unmatched ? (
                <Link href={`/cuoi/${weddingId}/mung/cho?quy=${fundId}`} className="btn-primary btn-sm mt-3 w-full">
                  Xác nhận {result.unmatched} khoản chưa rõ
                </Link>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
