"use client";

import { useActionState, useTransition } from "react";
import { updateFundBankAction, type FormState } from "@/app/actions/gifts";
import { setFundSharingAction } from "@/app/actions/wedding";
import { SubmitButton } from "@/components/submit-button";

export function BankForm({
  weddingId,
  fundId,
  banks,
  initial,
}: {
  weddingId: string;
  fundId: string;
  banks: { bin: string; name: string }[];
  initial: { bankBin: string; accountNumber: string; accountName: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(updateFundBankAction.bind(null, weddingId, fundId), {});
  return (
    <form action={action} className="panel space-y-3 px-4 py-4">
      <div>
        <label className="label" htmlFor="bankBin">
          Ngân hàng
        </label>
        <select id="bankBin" name="bankBin" className="field" defaultValue={initial.bankBin}>
          <option value="">Chọn ngân hàng</option>
          {banks.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="accountNumber">
          Số tài khoản
        </label>
        <input id="accountNumber" name="accountNumber" inputMode="numeric" className="field" defaultValue={initial.accountNumber} />
      </div>
      <div>
        <label className="label" htmlFor="accountName">
          Tên chủ tài khoản
        </label>
        <input id="accountName" name="accountName" className="field uppercase" defaultValue={initial.accountName} placeholder="NGUYEN VAN A" />
        <p className="hint">Hiện cho khách đối chiếu trước khi chuyển. Tiền vào thẳng tài khoản này, Trăm Năm không giữ tiền.</p>
      </div>
      {state.error ? <p className="font-medium text-son">{state.error}</p> : null}
      {state.ok ? <p className="font-medium text-moss">{state.ok}</p> : null}
      <SubmitButton>Lưu tài khoản</SubmitButton>
    </form>
  );
}

export function SharingToggle({ weddingId, fundId, coupleCanView }: { weddingId: string; fundId: string; coupleCanView: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="panel px-4 py-4">
      <p className="text-[0.95rem]">
        {coupleCanView ? "Cô dâu chú rể đang xem được các khoản trong quỹ này (không sửa được)." : "Chỉ bố mẹ bên này xem được số tiền trong quỹ."}
      </p>
      <button type="button" disabled={pending} onClick={() => start(() => setFundSharingAction(weddingId, fundId, !coupleCanView))} className="btn-quiet mt-3 w-full">
        {coupleCanView ? "Không cho cặp đôi xem" : "Cho cặp đôi xem"}
      </button>
    </div>
  );
}
