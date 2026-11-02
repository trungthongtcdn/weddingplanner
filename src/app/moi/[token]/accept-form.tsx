"use client";

import { useActionState } from "react";
import { acceptInviteAction, type FormState } from "@/app/actions/wedding";
import { SubmitButton } from "@/components/submit-button";

export function AcceptForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInviteAction.bind(null, token), {});
  return (
    <form action={action} className="mt-7 space-y-4">
      <div>
        <label className="label" htmlFor="displayName">
          Mọi người gọi bạn là
        </label>
        <input id="displayName" name="displayName" className="field" defaultValue={defaultName} placeholder="Ví dụ: Mẹ Lan, Bố Hùng" required />
      </div>
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      <SubmitButton pendingText="Đang tham gia…">Tham gia</SubmitButton>
    </form>
  );
}
