"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { formatPhone } from "@/lib/phone";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, { step: "phone", next });

  if (state.step === "code") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="phone" value={state.phone} />
        <input type="hidden" name="next" value={next} />
        <p className="text-muted">
          Đã gửi mã 6 số tới <strong className="text-ink">{formatPhone(state.phone)}</strong>.
        </p>
        {state.devCode ? (
          <p className="rounded-xl border border-dashed border-kim bg-kim-tint px-3.5 py-2.5 text-[0.9rem]">
            Bản thử nghiệm chưa nối dịch vụ SMS — mã của bạn là <strong className="tracking-widest">{state.devCode}</strong>
          </p>
        ) : null}
        <div>
          <label htmlFor="code" className="label">
            Mã xác nhận
          </label>
          <input
            id="code"
            name="code"
            className="field text-center text-[1.4rem] tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        {state.error ? <p className="text-[0.92rem] font-medium text-son">{state.error}</p> : null}
        <SubmitButton name="intent" value="verify" pendingText="Đang kiểm tra…">
          Đăng nhập
        </SubmitButton>
        <div className="flex justify-between text-[0.92rem]">
          <button name="intent" value="change" className="min-h-10 font-medium text-son" formNoValidate>
            Đổi số điện thoại
          </button>
          <button name="intent" value="resend" className="min-h-10 font-medium text-son" formNoValidate>
            Gửi lại mã
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="phone" className="label">
          Số điện thoại
        </label>
        <input
          id="phone"
          name="phone"
          className="field text-[1.15rem]"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912 345 678"
          defaultValue={state.phone}
          required
          autoFocus
        />
        <p className="hint">Mã đăng nhập sẽ gửi qua tin nhắn. Không cần mật khẩu.</p>
      </div>
      {state.error ? <p className="text-[0.92rem] font-medium text-son">{state.error}</p> : null}
      <SubmitButton name="intent" value="send" pendingText="Đang gửi mã…">
        Nhận mã đăng nhập
      </SubmitButton>
    </form>
  );
}
