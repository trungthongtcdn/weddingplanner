"use client";

import { useState, useTransition } from "react";
import { assignGiftAction } from "@/app/actions/gifts";

export function AssignGift({
  weddingId,
  giftId,
  suggestions,
  options,
}: {
  weddingId: string;
  giftId: string;
  suggestions: { guestId: string; label: string; reason: string }[];
  options: { id: string; label: string }[];
}) {
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState("");
  const assign = (guestId: string) => start(() => assignGiftAction(weddingId, giftId, guestId));
  return (
    <div className="mt-3 space-y-2">
      {suggestions.map((s) => (
        <button key={s.guestId} type="button" disabled={pending} onClick={() => assign(s.guestId)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line px-3.5 text-left hover:border-son">
          <span>
            <span className="block font-medium">{s.label}</span>
            <span className="block text-[0.8rem] text-muted">Gợi ý: {s.reason}</span>
          </span>
          <span className="text-[0.88rem] font-semibold text-son">Đúng</span>
        </button>
      ))}
      <div className="flex gap-2">
        <select value={picked} onChange={(e) => setPicked(e.target.value)} className="field py-2" aria-label="Chọn khách khác">
          <option value="">Chọn khách khác…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" disabled={!picked || pending} onClick={() => assign(picked)} className="btn-primary btn-sm shrink-0">
          Gán
        </button>
      </div>
      <button type="button" disabled={pending} onClick={() => assign("UNKNOWN")} className="min-h-10 w-full text-[0.88rem] font-medium text-muted">
        Không rõ người gửi
      </button>
    </div>
  );
}
