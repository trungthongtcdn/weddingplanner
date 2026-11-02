"use client";

import { useEffect, useState, useTransition } from "react";
import { markOpenedAction, remindOptInAction } from "@/app/actions/guests";
import { CopyButton } from "@/components/share-button";

export function InviteInteractions({ token, preview, remindOptIn }: { token: string; preview: boolean; remindOptIn: boolean }) {
  const [opted, setOpted] = useState(remindOptIn);
  const [pending, start] = useTransition();

  // Chỉ ghi "đã mở" khi trang chạy trong trình duyệt thật (trình xem trước link của Zalo không chạy JS).
  useEffect(() => {
    if (!preview) markOpenedAction(token).catch(() => {});
  }, [token, preview]);

  return (
    <div className="mt-6">
      {opted ? (
        <div className="space-y-2">
          <a href={`/t/${token}/lich`} className="btn-primary w-full">
            Thêm vào lịch điện thoại
          </a>
          <p className="text-center text-[0.85rem] text-muted">Lịch sẽ nhắc bạn một ngày trước tiệc.</p>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending || preview}
          onClick={() =>
            start(async () => {
              await remindOptInAction(token);
              setOpted(true);
            })
          }
          className="btn-primary w-full"
        >
          Nhắc tôi trước ngày cưới
        </button>
      )}
    </div>
  );
}

type QR = { dataUrl: string; bank: string; account: string; holder: string; note: string };

export function GiftSection({ qr, eventName, eventDate }: { qr: QR; eventName: string; eventDate: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <section className="mt-10 border-t border-line pt-6">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block font-semibold">Gửi lời chúc</span>
          <span className="block text-[0.88rem] text-muted">Dành cho ai ở xa hoặc muốn mừng qua chuyển khoản</span>
        </span>
        <span aria-hidden className={`text-[1.4rem] text-muted transition-transform ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      {open ? (
        <div className="mt-4 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt="Mã QR chuyển khoản mừng cưới" className="mx-auto w-60 rounded-xl border border-line bg-white p-2" />
          <dl className="panel rows text-[0.93rem]">
            <div className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Ngân hàng</dt>
              <dd className="font-medium">{qr.bank}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Số tài khoản</dt>
              <dd className="flex items-center gap-2 font-medium tabular-nums">
                {qr.account}
                <CopyButton value={qr.account} label="Chép" className="text-[0.85rem] font-medium text-son" />
              </dd>
            </div>
            {qr.holder ? (
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted">Chủ tài khoản</dt>
                <dd className="font-medium">{qr.holder}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Nội dung</dt>
              <dd className="flex items-center gap-2 font-medium">
                {qr.note}
                <CopyButton value={qr.note} label="Chép" className="text-[0.85rem] font-medium text-son" />
              </dd>
            </div>
          </dl>
          <p className="text-[0.85rem] text-muted">Giữ nguyên mã trong nội dung chuyển khoản để gia đình biết lời chúc của bạn. Tiền chuyển thẳng vào tài khoản của gia đình.</p>
          {sent ? (
            <a
              href={`/so-di?them=1&su-kien=${encodeURIComponent(eventName)}&ngay=${eventDate}`}
              className="block rounded-xl border border-kim/40 bg-kim-tint px-4 py-3 text-[0.93rem]"
            >
              <span className="font-semibold">Lưu vào sổ đi của bạn</span>
              <span className="block text-ink/75">Ghi lại khoản đã mừng để sau này không quên. Bỏ qua cũng được.</span>
            </a>
          ) : (
            <button type="button" onClick={() => setSent(true)} className="btn-quiet w-full">
              Tôi đã gửi
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
