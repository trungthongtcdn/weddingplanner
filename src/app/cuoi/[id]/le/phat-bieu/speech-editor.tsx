"use client";

import { useActionState, useState } from "react";
import { polishSpeechAction, type SpeechState } from "@/app/actions/plan";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/share-button";

export function SpeechEditor({
  weddingId,
  ceremony,
  side,
  initialText,
  aiOn,
}: {
  weddingId: string;
  ceremony: string;
  side: string;
  initialText: string;
  aiOn: boolean;
}) {
  const [state, action] = useActionState<SpeechState, FormData>(polishSpeechAction.bind(null, weddingId), { text: initialText });
  const [text, setText] = useState(initialText);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setText(state.text);
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="ceremony" value={ceremony} />
      <input type="hidden" name="side" value={side} />
      <div>
        <label className="label" htmlFor="speakerTitle">
          Người phát biểu
        </label>
        <input id="speakerTitle" name="speakerTitle" className="field" placeholder="Ví dụ: ông Nguyễn Văn An, bác ruột chú rể" />
      </div>
      <div>
        <label className="label" htmlFor="text">
          Nội dung
        </label>
        <textarea id="text" name="text" className="field min-h-80 leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="hint">Sửa trực tiếp cho hợp giọng người nói. Thay “tôi là …” bằng tên và vai vế thật.</p>
      </div>
      {state.error ? <p className="text-[0.92rem] text-amber">{state.error}</p> : null}
      {state.polished ? <p className="text-[0.92rem] text-moss">AI đã chỉnh câu chữ. Đọc lại trước khi dùng.</p> : null}
      <div className="flex gap-2">
        <CopyButton value={text} label="Sao chép" className="btn-quiet flex-1" />
        {aiOn ? (
          <SubmitButton className="btn-primary flex-1" pendingText="AI đang viết…">
            Nhờ AI chỉnh lời
          </SubmitButton>
        ) : null}
      </div>
      {aiOn ? (
        <fieldset className="flex flex-wrap gap-2 text-[0.88rem]">
          <legend className="mb-1 text-muted">Giọng văn</legend>
          {["trang trọng", "gần gũi, ấm áp", "ngắn gọn"].map((t, i) => (
            <label key={t} className="chip cursor-pointer border border-line bg-surface px-3 py-1.5 has-[:checked]:border-son has-[:checked]:text-son">
              <input type="radio" name="tone" value={t} defaultChecked={i === 0} className="sr-only" />
              {t}
            </label>
          ))}
        </fieldset>
      ) : null}
    </form>
  );
}
