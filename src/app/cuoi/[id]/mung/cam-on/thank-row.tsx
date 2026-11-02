"use client";

import { useState } from "react";
import { markThankedAction } from "@/app/actions/gifts";
import { ZaloInvite } from "@/components/zalo-invite";

export function ThankRow({ weddingId, fundId, guestId, name, phone, message }: { weddingId: string; fundId: string; guestId: string; name: string; phone: string | null; message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span className="font-medium">{name}</span>
        <span className="text-[0.88rem] font-medium text-son">{open ? "Đóng" : "Soạn lời cảm ơn"}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-paper px-3 py-2 text-[0.9rem]">{message}</p>
          <ZaloInvite phone={phone} message={message} sent={false} label="Gửi lời cảm ơn qua Zalo" onSent={() => markThankedAction(weddingId, fundId, guestId)} />
        </div>
      ) : null}
    </li>
  );
}
