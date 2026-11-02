import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { Mark } from "@/components/mark";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <Mark className="h-12 w-12 text-son" />
      <h1 className="mt-6 text-[1.9rem] leading-tight font-bold">Đăng nhập</h1>
      <p className="mt-2 mb-7 text-muted">Dùng số điện thoại của bạn. Bố mẹ và người thân được mời cũng đăng nhập theo cách này.</p>
      <LoginForm next={next} pilot={Boolean(process.env.PILOT_ACCESS_CODE)} />
    </main>
  );
}
