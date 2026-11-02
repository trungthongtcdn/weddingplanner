"use client";

import { useEffect, useState, useTransition } from "react";
import { setCallResultAction, markInviteSentAction } from "@/app/actions/guests";
import { ZaloInvite } from "@/components/zalo-invite";
import { formatPhone } from "@/lib/phone";

type QItem = { id: string; name: string; honorific: string | null; groupName: string | null; phone: string; retry: boolean; message: string };

const RESULTS: [string, string][] = [
  ["SE_DI", "Sẽ đi"],
  ["CHUA_CHAC", "Chưa chắc"],
  ["KHONG_DI", "Không đi được"],
  ["KHONG_NGHE", "Không nghe máy"],
];

export function CallQueue({ weddingId, queue }: { weddingId: string; queue: QItem[] }) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"call" | "result" | "invite">("call");
  const [pending, start] = useTransition();
  const done = index >= queue.length;
  const g = queue[index];

  // Quay lại app sau cuộc gọi thì hiện ngay các nút ghi kết quả.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setStage((s) => (s === "call" && sessionStorage.getItem("tn_calling") === g?.id ? "result" : s));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [g?.id]);

  function next() {
    setIndex((i) => i + 1);
    setStage("call");
    try {
      sessionStorage.removeItem("tn_calling");
    } catch {}
  }

  function record(result: string) {
    start(async () => {
      await setCallResultAction(weddingId, g.id, result);
      if (result === "SE_DI" || result === "CHUA_CHAC") setStage("invite");
      else next();
    });
  }

  if (done) {
    return (
      <div className="panel px-5 py-7 text-center">
        <p className="font-semibold">Đã đi hết danh sách gọi.</p>
        <p className="mt-1 text-[0.92rem] text-muted">Người không nghe máy sẽ có mặt ở lần mở sau.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[0.88rem] text-muted tabular-nums">
        Người {index + 1}/{queue.length}
      </p>
      <div className="panel px-5 py-5">
        {g.retry ? <span className="chip mb-2 bg-amber-tint text-amber">Gọi lại</span> : null}
        <div className="text-[1.5rem] leading-tight font-bold">
          {g.honorific ? <span className="font-medium text-muted">{g.honorific} </span> : null}
          {g.name}
        </div>
        <div className="mt-1 text-muted">
          {g.groupName ?? "Chưa xếp nhóm"} · {formatPhone(g.phone)}
        </div>

        <div className="mt-5">
          {stage === "call" ? (
            <div className="space-y-2">
              <a
                href={`tel:${g.phone}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem("tn_calling", g.id);
                  } catch {}
                  setTimeout(() => setStage("result"), 1500);
                }}
                className="btn-primary w-full text-[1.05rem]"
              >
                Gọi {formatPhone(g.phone)}
              </a>
              <button type="button" onClick={() => setStage("result")} className="btn-quiet w-full">
                Đã gọi bằng máy khác
              </button>
            </div>
          ) : null}

          {stage === "result" ? (
            <div>
              <p className="mb-2 font-medium">Kết quả cuộc gọi</p>
              <div className="grid grid-cols-2 gap-2">
                {RESULTS.map(([v, l]) => (
                  <button key={v} type="button" disabled={pending} onClick={() => record(v)} className={v === "SE_DI" ? "btn-primary" : "btn-quiet"}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stage === "invite" ? (
            <ZaloInvite
              phone={g.phone}
              message={g.message}
              sent={false}
              onSent={async () => {
                await markInviteSentAction(weddingId, g.id);
                next();
              }}
            />
          ) : null}
        </div>
      </div>
      <button type="button" onClick={next} className="mt-3 min-h-11 w-full text-[0.93rem] font-medium text-muted">
        Bỏ qua, sang người tiếp theo
      </button>
    </div>
  );
}
