"use client";

import { useActionState, useEffect, useRef } from "react";
import { addOutgoingAction, type FormState } from "@/app/actions/gifts";
import { SubmitButton } from "@/components/submit-button";

export function OutgoingForm({ defaults }: { defaults: { eventName: string; eventDate: string; personName: string } }) {
  const [state, action] = useActionState<FormState, FormData>(addOutgoingAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="panel space-y-3 px-4 py-4">
      <input name="personName" className="field" defaultValue={defaults.personName} placeholder="Mừng ai, ví dụ: anh Tuấn" aria-label="Người nhận" required />
      <input name="eventName" className="field" defaultValue={defaults.eventName} placeholder="Dịp gì, ví dụ: Cưới Tuấn & Hà" aria-label="Dịp" />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" inputMode="numeric" className="field" placeholder="Số tiền (đ)" aria-label="Số tiền" />
        <input name="eventDate" type="date" className="field" defaultValue={defaults.eventDate} aria-label="Ngày" />
      </div>
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton>Lưu vào sổ đi</SubmitButton>
    </form>
  );
}
