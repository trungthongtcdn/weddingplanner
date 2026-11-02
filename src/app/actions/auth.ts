"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { normalizeVnPhone } from "@/lib/phone";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession } from "@/lib/auth/session";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  devCode?: string;
  error?: string;
  next?: string;
};

/** Giai đoạn thử nghiệm: khi đặt PILOT_ACCESS_CODE, chỉ người có mã mới nhận được OTP. */
function pilotCodeOk(value: FormDataEntryValue | null): boolean {
  const expected = process.env.PILOT_ACCESS_CODE;
  if (!expected) return true;
  const a = Buffer.from(String(value ?? "").trim().toUpperCase());
  const b = Buffer.from(expected.trim().toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent");
  const next = safeNext(form.get("next"));

  if (intent === "send" || intent === "resend") {
    const phone = normalizeVnPhone(String(form.get("phone") ?? prev.phone ?? ""));
    if (!phone) return { step: "phone", error: "Số điện thoại chưa đúng. Nhập 10 chữ số, ví dụ 0912 345 678.", next };
    if (intent === "send" && !pilotCodeOk(form.get("pilot"))) return { step: "phone", phone, error: "Mã thử nghiệm chưa đúng.", next };
    const res = await requestOtp(phone);
    if (!res.ok) return { step: intent === "resend" ? "code" : "phone", phone, error: res.error, next };
    return { step: "code", phone, devCode: res.devCode, next };
  }

  if (intent === "verify") {
    const phone = normalizeVnPhone(String(form.get("phone") ?? ""));
    const code = String(form.get("code") ?? "").replace(/\D/g, "");
    if (!phone) return { step: "phone", error: "Nhập lại số điện thoại.", next };
    if (code.length !== 6) return { ...prev, step: "code", phone, error: "Mã gồm 6 chữ số." };
    const res = await verifyOtp(phone, code);
    if (!res.ok) return { ...prev, step: "code", phone, error: res.error };
    await createSession(phone);
    redirect(next);
  }

  if (intent === "change") return { step: "phone", next };
  return prev;
}

export async function logoutAction() {
  await destroySession();
  redirect("/dang-nhap");
}
