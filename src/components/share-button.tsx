"use client";

import { useState } from "react";

/** Chia sẻ qua bảng chia sẻ của điện thoại (chọn Zalo), hoặc sao chép nếu trình duyệt không hỗ trợ. */
export function ShareButton({ text, url, label = "Gửi link", className = "btn-quiet btn-sm" }: { text: string; url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text, url });
        return;
      } catch {
        /* người dùng huỷ — chuyển sang sao chép */
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {copied ? "Đã sao chép" : label}
    </button>
  );
}

export function CopyButton({ value, label = "Sao chép", className = "btn-quiet btn-sm" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Đã sao chép" : label}
    </button>
  );
}
