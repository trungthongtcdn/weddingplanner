"use client";

import { useActionState, useRef, useEffect } from "react";
import { addTaskAction, type FormState } from "@/app/actions/plan";
import { SubmitButton } from "@/components/submit-button";

const OPTIONS: [string, string][] = [
  ["CHUNG", "Việc chung"],
  ["DAM_NGO", "Dạm ngõ"],
  ["AN_HOI", "Ăn hỏi"],
  ["LE_CUOI", "Lễ cưới"],
  ["LAI_MAT", "Lại mặt"],
];

export function AddTaskForm({ weddingId, members }: { weddingId: string; members: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(addTaskAction.bind(null, weddingId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="panel space-y-3 px-4 py-4">
      <input name="title" className="field" placeholder="Ví dụ: Đặt hoa cưới" aria-label="Tên việc" required />
      <div className="grid grid-cols-2 gap-2">
        <select name="ceremony" className="field" aria-label="Thuộc lễ">
          {OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input type="date" name="dueDate" className="field" aria-label="Hạn" />
      </div>
      <select name="assignee" className="field" aria-label="Giao cho" defaultValue="">
        <option value="">Chưa giao</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {state.error ? <p className="text-[0.9rem] font-medium text-son">{state.error}</p> : null}
      <SubmitButton pendingText="Đang thêm…">Thêm việc</SubmitButton>
    </form>
  );
}
