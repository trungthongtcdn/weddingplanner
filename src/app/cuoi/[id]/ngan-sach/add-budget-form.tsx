"use client";

import { useActionState, useEffect, useRef } from "react";
import { addBudgetItemAction, type FormState } from "@/app/actions/plan";
import { SubmitButton } from "@/components/submit-button";

export function AddBudgetForm({ weddingId }: { weddingId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addBudgetItemAction.bind(null, weddingId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="panel space-y-3 px-4 py-4">
      <input name="title" className="field" placeholder="Ví dụ: Tráp ăn hỏi 7 tráp" aria-label="Khoản chi" required />
      <div className="grid grid-cols-2 gap-2">
        <select name="payer" className="field" aria-label="Bên chi" defaultValue="NHA_TRAI">
          <option value="NHA_TRAI">Nhà trai chi</option>
          <option value="NHA_GAI">Nhà gái chi</option>
          <option value="CAP_DOI">Cặp đôi chi</option>
        </select>
        <input name="planned" inputMode="numeric" className="field" placeholder="Dự kiến (đ)" aria-label="Số tiền dự kiến" />
      </div>
      {state.error ? <p className="text-[0.9rem] font-medium text-son">{state.error}</p> : null}
      <SubmitButton pendingText="Đang thêm…">Thêm khoản chi</SubmitButton>
    </form>
  );
}
