"use client";

import { useTransition } from "react";
import { setCallResultAction, markInviteSentAction, markAttendedAction } from "@/app/actions/guests";
import { ZaloInvite } from "@/components/zalo-invite";
import { formatPhone } from "@/lib/phone";

export function GuestActions({
  weddingId,
  guestId,
  phone,
  message,
  sent,
  attended,
}: {
  weddingId: string;
  guestId: string;
  phone: string | null;
  message: string;
  sent: boolean;
  attended: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="panel space-y-3 px-4 py-4">
      {phone ? (
        <a href={`tel:${phone}`} className="btn-quiet w-full">
          Gọi {formatPhone(phone)}
        </a>
      ) : null}
      {phone ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            ["SE_DI", "Sẽ đi"],
            ["CHUA_CHAC", "Chưa chắc"],
            ["KHONG_DI", "Không đi được"],
            ["KHONG_NGHE", "Không nghe máy"],
          ].map(([v, l]) => (
            <button key={v} type="button" disabled={pending} onClick={() => start(() => setCallResultAction(weddingId, guestId, v))} className="btn-quiet btn-sm">
              {l}
            </button>
          ))}
        </div>
      ) : null}
      <ZaloInvite phone={phone} message={message} sent={sent} onSent={() => markInviteSentAction(weddingId, guestId)} />
      {!attended ? (
        <button type="button" disabled={pending} onClick={() => start(() => markAttendedAction(weddingId, guestId))} className="min-h-10 w-full text-[0.9rem] font-medium text-muted">
          Đánh dấu khách đã có mặt
        </button>
      ) : null}
    </div>
  );
}
