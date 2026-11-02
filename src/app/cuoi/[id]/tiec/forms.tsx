"use client";

import { useActionState } from "react";
import { savePartyAction, updateInviteSettingsAction, type FormState } from "@/app/actions/wedding";
import { SubmitButton } from "@/components/submit-button";

type Party = { id: string; name: string; side: string; startsAt: string; venue: string | null; address: string | null; seatsPerTable: number };

export function PartyForm({ weddingId, party, defaultDate }: { weddingId: string; party: Party | null; defaultDate?: string }) {
  const [state, action] = useActionState<FormState, FormData>(savePartyAction.bind(null, weddingId, party?.id ?? null), {});
  const p = party;
  return (
    <form action={action} className="space-y-3">
      <input name="name" className="field" defaultValue={p?.name} placeholder="Tên tiệc, ví dụ: Tiệc nhà gái" aria-label="Tên tiệc" required />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" name="date" className="field" defaultValue={p?.startsAt.slice(0, 10) ?? defaultDate} aria-label="Ngày" required />
        <input type="time" name="time" className="field" defaultValue={p?.startsAt.slice(11, 16) ?? "11:00"} aria-label="Giờ" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="side" className="field" defaultValue={p?.side ?? "NHA_GAI"} aria-label="Tiệc của bên">
          <option value="NHA_GAI">Nhà gái</option>
          <option value="NHA_TRAI">Nhà trai</option>
          <option value="CAP_DOI">Cặp đôi</option>
        </select>
        <label className="flex items-center gap-2 text-[0.9rem]">
          <input name="seatsPerTable" inputMode="numeric" className="field w-16 px-2 text-center" defaultValue={p?.seatsPerTable ?? 10} aria-label="Số người mỗi mâm" />
          người/mâm
        </label>
      </div>
      <input name="venue" className="field" defaultValue={p?.venue ?? ""} placeholder="Nhà hàng / tư gia" aria-label="Nơi tổ chức" />
      <input name="address" className="field" defaultValue={p?.address ?? ""} placeholder="Địa chỉ để khách tìm đường" aria-label="Địa chỉ" />
      {state.error ? <p className="text-[0.9rem] font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="text-[0.9rem] font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton className="btn-primary btn-sm w-full">{p ? "Lưu tiệc" : "Thêm tiệc"}</SubmitButton>
    </form>
  );
}

export function InviteSettingsForm({ weddingId, message, giftQrEnabled, sample }: { weddingId: string; message: string; giftQrEnabled: boolean; sample: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateInviteSettingsAction.bind(null, weddingId), {});
  return (
    <form action={action} className="panel space-y-3 px-4 py-4">
      <div>
        <label className="label" htmlFor="inviteMessage">
          Câu mời đầu tin nhắn
        </label>
        <textarea
          id="inviteMessage"
          name="inviteMessage"
          className="field min-h-24"
          defaultValue={message}
          placeholder="Để trống để dùng câu mặc định. Viết {ten} ở chỗ cần điền tên khách."
        />
        <p className="hint">Ví dụ: “Con xin kính mời {"{ten}"} đến chung vui cùng gia đình.” Giờ tiệc và link thiệp được thêm tự động.</p>
      </div>
      <div>
        <span className="label">Tin nhắn mẫu</span>
        <pre className="rounded-xl bg-paper px-3.5 py-3 text-[0.88rem] whitespace-pre-wrap">{sample}</pre>
      </div>
      <label className="flex gap-3 rounded-xl border border-line px-3.5 py-3">
        <input type="checkbox" name="giftQrEnabled" defaultChecked={giftQrEnabled} className="mt-1 h-5 w-5 accent-son" />
        <span>
          <span className="block font-medium">Hiện mục “Gửi lời chúc” có mã QR mừng</span>
          <span className="block text-[0.85rem] text-muted">Nằm cuối trang thiệp, khách phải bấm mở mới thấy — không in lên mặt thiệp.</span>
        </span>
      </label>
      {state.error ? <p className="text-[0.9rem] font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="text-[0.9rem] font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton>Lưu lời mời</SubmitButton>
    </form>
  );
}
