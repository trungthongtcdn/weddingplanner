"use client";

import { useActionState } from "react";
import { createWeddingAction, type FormState } from "@/app/actions/wedding";
import { SubmitButton } from "@/components/submit-button";
import { WeddingFields } from "@/components/wedding-fields";

export function NewWeddingForm() {
  const [state, action] = useActionState<FormState, FormData>(createWeddingAction, {});
  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-[1.05rem] font-semibold">Bạn là</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["groom", "Chú rể"],
            ["bride", "Cô dâu"],
          ].map(([value, label], i) => (
            <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 has-[:checked]:border-son has-[:checked]:bg-son-tint">
              <input type="radio" name="myRole" value={value} defaultChecked={i === 0} className="accent-son" />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <WeddingFields />
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      <SubmitButton pendingText="Đang tạo…">Tạo kế hoạch cưới</SubmitButton>
    </form>
  );
}
