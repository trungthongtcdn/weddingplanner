"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { parseEnvelopeAction, addGiftAction, type EnvelopeParse } from "@/app/actions/gifts";
import { formatVnd } from "@/lib/vn-money";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export function EnvelopeEntry({ weddingId, fundId }: { weddingId: string; fundId: string }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<EnvelopeParse | null>(null);
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [guestId, setGuestId] = useState<string>("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ who: string; what: string }[]>([]);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceSupported = useSyncExternalStore(noopSubscribe, () => getRecognitionCtor() !== null, () => false);

  function analyse(value: string) {
    const v = value.trim();
    if (!v) return;
    start(async () => {
      const r = await parseEnvelopeAction(weddingId, fundId, v);
      if (!r) {
        setError("Bạn không quản lý quỹ này.");
        return;
      }
      setParsed(r);
      setAmount(r.amount ? String(r.amount) : "");
      setItem(r.itemDesc ?? "");
      setGuestId(r.suggestions[0] && r.suggestions[0].score >= 0.7 ? r.suggestions[0].guestId : r.suggestions.length ? "" : "__none");
      setError(null);
    });
  }

  function listen() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "vi-VN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      setText(t);
      analyse(t);
    };
    rec.onerror = (e) => setError(e.error === "not-allowed" ? "Trình duyệt chưa được phép dùng micro." : "Không nghe rõ, đọc lại hoặc gõ tay.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    setError(null);
    rec.start();
  }

  function reset() {
    setText("");
    setParsed(null);
    setAmount("");
    setItem("");
    setGuestId("");
    inputRef.current?.focus();
  }

  function save() {
    const amt = Number(amount.replace(/\D/g, "") || 0);
    if (!amt && !item.trim()) {
      setError("Nhập số tiền hoặc món quà.");
      return;
    }
    if (!guestId) {
      setError("Chọn khách, hoặc chọn “Không có trong danh sách”.");
      return;
    }
    const chosen = parsed?.suggestions.find((s) => s.guestId === guestId);
    start(async () => {
      const res = await addGiftAction(weddingId, fundId, {
        guestId: guestId === "__none" ? null : guestId,
        method: item.trim() && !amt ? "HIEN_VAT" : "PHONG_BI",
        amount: amt,
        itemDesc: item.trim() || null,
        note: guestId === "__none" ? parsed?.nameText || null : null,
        rawText: text.trim() || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setLog((l) => [
        { who: chosen ? `${chosen.honorific ? chosen.honorific + " " : ""}${chosen.name}` : parsed?.nameText || "Chưa rõ là ai", what: item.trim() || formatVnd(amt) },
        ...l,
      ]);
      reset();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyse(text);
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field"
          placeholder="chú Hùng hàng xóm năm trăm"
          aria-label="Tên và số tiền trên phong bì"
          autoFocus
        />
        <button className="btn-quiet shrink-0 px-4" disabled={pending}>
          Đọc
        </button>
      </form>
      {voiceSupported ? (
        <button
          type="button"
          onClick={listening ? () => recRef.current?.stop() : listen}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 py-5 font-semibold ${listening ? "border-son bg-son text-white" : "border-son/30 bg-son-tint text-son-dark"}`}
          aria-pressed={listening}
        >
          <svg aria-hidden width="30" height="30" viewBox="0 0 24 24">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {listening ? "Đang nghe… bấm để dừng" : "Bấm và đọc phong bì"}
        </button>
      ) : (
        <p className="hint">Trình duyệt này chưa hỗ trợ nhập bằng giọng nói — gõ tay vẫn nhanh: tên, quan hệ, số tiền.</p>
      )}

      {error ? <p className="font-medium text-son">{error}</p> : null}

      {parsed ? (
        <div className="panel space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="amt">
                Số tiền
              </label>
              <input id="amt" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="field" placeholder="0" />
              {Number(amount.replace(/\D/g, "")) ? <p className="hint tabular-nums">{formatVnd(Number(amount.replace(/\D/g, "")))}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="item">
                Hiện vật
              </label>
              <input id="item" value={item} onChange={(e) => setItem(e.target.value)} className="field" placeholder="một chỉ vàng" />
            </div>
          </div>
          <fieldset>
            <legend className="label">Của ai{parsed.nameText ? ` — “${parsed.nameText}”` : ""}</legend>
            <div className="space-y-2">
              {parsed.suggestions.map((s) => (
                <label key={s.guestId} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 has-[:checked]:border-son has-[:checked]:bg-son-tint">
                  <input type="radio" name="guest" checked={guestId === s.guestId} onChange={() => setGuestId(s.guestId)} className="accent-son" />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {s.honorific ? <span className="font-normal text-muted">{s.honorific} </span> : null}
                      {s.name}
                    </span>
                    <span className="block text-[0.82rem] text-muted">
                      {s.groupName ?? "Chưa xếp nhóm"} · {s.reason}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 has-[:checked]:border-son has-[:checked]:bg-son-tint">
                <input type="radio" name="guest" checked={guestId === "__none"} onChange={() => setGuestId("__none")} className="accent-son" />
                <span>Không có trong danh sách — để vào “Ai đây?”</span>
              </label>
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending} className="btn-primary flex-1">
              {pending ? "Đang ghi…" : "Ghi vào sổ"}
            </button>
            <button type="button" onClick={reset} className="btn-quiet">
              Bỏ
            </button>
          </div>
        </div>
      ) : null}

      {log.length ? (
        <div>
          <p className="mb-2 font-semibold">Vừa ghi ({log.length})</p>
          <ul className="panel rows text-[0.93rem]">
            {log.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 px-4 py-2.5">
                <span>{l.who}</span>
                <span className="font-medium tabular-nums">{l.what}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
