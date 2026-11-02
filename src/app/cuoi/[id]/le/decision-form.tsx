"use client";

import { useActionState, useState } from "react";
import { saveDecisionAction, type FormState } from "@/app/actions/plan";
import { SubmitButton } from "@/components/submit-button";

type Choice = "GROOM" | "BRIDE" | "CUSTOM";

export function DecisionForm({
  weddingId,
  diffKey,
  groomText,
  brideText,
  initial,
  readOnly,
}: {
  weddingId: string;
  diffKey: string;
  groomText: string;
  brideText: string;
  initial: { choice: Choice; note: string; confirmed: boolean } | null;
  readOnly: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveDecisionAction.bind(null, weddingId, diffKey), {});
  const [choice, setChoice] = useState<Choice | undefined>(initial?.choice);
  const options: [Choice, string][] = [
    ["GROOM", groomText],
    ["BRIDE", brideText],
    ["CUSTOM", "Hai nhà làm theo cách riêng"],
  ];
  return (
    <form action={action} className="mt-3 space-y-2">
      <fieldset disabled={readOnly} className="space-y-2">
        {options.map(([value, text]) => (
          <label key={value} className="flex cursor-pointer gap-3 rounded-xl border border-line px-3.5 py-2.5 text-[0.93rem] has-[:checked]:border-son has-[:checked]:bg-son-tint">
            <input type="radio" name="choice" value={value} checked={choice === value} onChange={() => setChoice(value)} className="mt-1 accent-son" />
            <span>{text}</span>
          </label>
        ))}
        {choice === "CUSTOM" ? (
          <textarea name="note" className="field min-h-20" defaultValue={initial?.note} placeholder="Ghi lại cách hai nhà đã thống nhất" />
        ) : (
          <input type="hidden" name="note" value={initial?.note ?? ""} />
        )}
        {!readOnly ? (
          <>
            <label className="flex min-h-10 items-center gap-2.5 text-[0.93rem]">
              <input type="checkbox" name="confirmed" defaultChecked={initial?.confirmed} className="h-5 w-5 accent-moss" />
              Hai nhà đã chốt
            </label>
            {state.error ? <p className="text-[0.9rem] font-medium text-son">{state.error}</p> : null}
            {state.ok ? <p className="text-[0.9rem] font-medium text-moss">{state.ok}</p> : null}
            <SubmitButton className="btn-quiet btn-sm w-full">Lưu lựa chọn</SubmitButton>
          </>
        ) : null}
      </fieldset>
    </form>
  );
}
