"use client";

import { useState, useTransition } from "react";

/**
 * Gửi thiệp từ chính Zalo của người mời: sao chép sẵn lời mời rồi mở khung chat theo số điện thoại.
 * Ứng dụng không đọc được Zalo, nên người dùng tự xác nhận "Đã gửi".
 */
export function ZaloInvite({
  phone,
  message,
  onSent,
  sent,
}: {
  phone: string | null;
  message: string;
  onSent: () => Promise<void>;
  sent: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  async function open() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    setOpened(true);
    if (phone) {
      window.open(`https://zalo.me/${phone}`, "_blank", "noopener");
    } else {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) await nav.share({ text: message }).catch(() => {});
    }
  }

  if (sent && !opened) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.92rem] text-moss">Đã gửi thiệp</span>
        <button type="button" onClick={open} className="btn-quiet btn-sm">
          Gửi lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={open} className="btn-primary w-full">
        {phone ? "Gửi thiệp qua Zalo" : "Chia sẻ thiệp"}
      </button>
      {opened ? (
        <>
          <p className="text-[0.88rem] text-muted">
            {copied ? "Lời mời đã được sao chép. Trong Zalo, nhấn giữ ô chat → Dán → Gửi." : "Không sao chép được tự động — chép lời mời bên dưới."}
          </p>
          {!copied ? <textarea readOnly value={message} className="field min-h-28 text-[0.9rem]" /> : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => start(onSent)}
            className="btn-quiet w-full border-moss/40 text-moss"
          >
            {pending ? "Đang lưu…" : "Đã gửi xong"}
          </button>
        </>
      ) : null}
    </div>
  );
}
