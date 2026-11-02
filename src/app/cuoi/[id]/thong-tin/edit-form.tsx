"use client";

import { useActionState } from "react";
import { updateWeddingAction, type FormState } from "@/app/actions/wedding";
import { SubmitButton } from "@/components/submit-button";
import { WeddingFields } from "@/components/wedding-fields";
import type { Region } from "@/lib/db/schema";

type W = {
  groomName: string;
  brideName: string;
  groomRegion: Region;
  brideRegion: Region;
  groomProvince: string | null;
  brideProvince: string | null;
  weddingDate: string;
  groomBirthYear: number | null;
  brideBirthYear: number | null;
};

export function EditWeddingForm({ weddingId, wedding }: { weddingId: string; wedding: W }) {
  const [state, action] = useActionState<FormState, FormData>(updateWeddingAction.bind(null, weddingId), {});
  return (
    <form action={action} className="space-y-6">
      <WeddingFields v={wedding} />
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton>Lưu thay đổi</SubmitButton>
      <p className="hint">Đổi ngày cưới không tự dời hạn các việc đã có.</p>
    </form>
  );
}
