"use client";

import { useActionState, useState } from "react";
import { editGiftAction, deleteGiftAction, type FormState } from "@/app/actions/gifts";
import { SubmitButton } from "@/components/submit-button";

type G = {
  id: string;
  amount: number;
  itemDesc: string | null;
  note: string | null;
  rawText: string | null;
  matchStatus: string;
  methodLabel: string;
  who: string | null;
  amountText: string;
};

export function GiftRow({ weddingId, gift, canEdit }: { weddingId: string; gift: G; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(editGiftAction.bind(null, weddingId, gift.id), {});
  return (
    <li>
      <button type="button" onClick={() => canEdit && setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="min-w-0">
          <span className={`block truncate font-medium ${gift.who ? "" : "text-amber"}`}>{gift.who ?? (gift.matchStatus === "UNKNOWN" ? "Không rõ người gửi" : "Chưa rõ là ai")}</span>
          <span className="block truncate text-[0.82rem] text-muted">
            {gift.methodLabel}
            {gift.rawText ? ` · ${gift.rawText}` : ""}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{gift.amountText}</span>
      </button>
      {open ? (
        <form action={action} className="space-y-2 border-t border-dashed border-line bg-paper/50 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <input name="amount" inputMode="numeric" defaultValue={gift.amount || ""} placeholder="Số tiền (đ)" className="field py-2" aria-label="Số tiền" />
            <input name="itemDesc" defaultValue={gift.itemDesc ?? ""} placeholder="Hiện vật" className="field py-2" aria-label="Hiện vật" />
          </div>
          <input name="note" defaultValue={gift.note ?? ""} placeholder="Ghi chú" className="field py-2" aria-label="Ghi chú" />
          {state.error ? <p className="text-[0.88rem] text-son">{state.error}</p> : null}
          {state.ok ? <p className="text-[0.88rem] text-moss">{state.ok}</p> : null}
          <div className="flex gap-2">
            <SubmitButton className="btn-primary btn-sm flex-1">Lưu</SubmitButton>
            <button
              type="button"
              className="btn-quiet btn-sm"
              onClick={async () => {
                if (confirm("Xoá khoản này khỏi sổ?")) await deleteGiftAction(weddingId, gift.id);
              }}
            >
              Xoá
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
