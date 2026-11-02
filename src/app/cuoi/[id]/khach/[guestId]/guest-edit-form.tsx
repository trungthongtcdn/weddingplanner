"use client";

import { useActionState } from "react";
import { updateGuestAction, deleteGuestAction, type GuestFormState } from "@/app/actions/guests";
import { SubmitButton } from "@/components/submit-button";
import { useRouter } from "next/navigation";

type G = { id: string; name: string; honorific: string | null; phone: string | null; groupName: string | null; note: string | null; side: string; partyIds: string[] };

export function GuestEditForm({
  weddingId,
  guest,
  sides,
  parties,
}: {
  weddingId: string;
  guest: G;
  sides: { value: string; label: string }[];
  parties: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<GuestFormState, FormData>(updateGuestAction.bind(null, weddingId, guest.id), {});
  const router = useRouter();
  return (
    <form action={action} className="panel space-y-3 px-4 py-4">
      <div className="grid grid-cols-[6.5rem_1fr] gap-2">
        <div>
          <label className="label" htmlFor="honorific">
            Xưng hô
          </label>
          <input id="honorific" name="honorific" className="field" defaultValue={guest.honorific ?? ""} placeholder="chú" />
        </div>
        <div>
          <label className="label" htmlFor="name">
            Tên
          </label>
          <input id="name" name="name" className="field" defaultValue={guest.name} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Số điện thoại
        </label>
        <input id="phone" name="phone" type="tel" className="field" defaultValue={guest.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="groupName">
          Nhóm
        </label>
        <input id="groupName" name="groupName" className="field" defaultValue={guest.groupName ?? ""} />
      </div>
      {sides.length > 1 ? (
        <div>
          <label className="label" htmlFor="side">
            Thuộc danh sách
          </label>
          <select id="side" name="side" className="field" defaultValue={guest.side}>
            {sides.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {parties.length ? (
        <fieldset>
          <legend className="label">Mời dự tiệc</legend>
          <div className="space-y-2">
            {parties.map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3.5 text-[0.93rem]">
                <input type="checkbox" name="partyIds" value={p.id} defaultChecked={guest.partyIds.includes(p.id)} className="h-5 w-5 accent-son" />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div>
        <label className="label" htmlFor="note">
          Ghi chú
        </label>
        <textarea id="note" name="note" className="field min-h-20" defaultValue={guest.note ?? ""} />
      </div>
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton>Lưu thông tin</SubmitButton>
      <button
        type="button"
        className="min-h-11 w-full text-[0.9rem] font-medium text-son"
        onClick={async () => {
          if (!confirm(`Xoá ${guest.name} khỏi danh sách khách?`)) return;
          await deleteGuestAction(weddingId, guest.id);
          router.push(`/cuoi/${weddingId}/khach`);
        }}
      >
        Xoá khách này
      </button>
    </form>
  );
}
