import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { NewWeddingForm } from "./new-wedding-form";

export const metadata: Metadata = { title: "Tạo đám cưới" };

export default async function StartPage() {
  await requireUser("/bat-dau");
  return (
    <main className="mx-auto max-w-md px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-12">
      <h1 className="text-[1.75rem] leading-tight font-bold">Đám cưới của hai bạn</h1>
      <p className="mt-2 mb-6 text-muted">Quê hai bên giúp lập lộ trình lễ đúng phong tục. Mọi thông tin đều sửa lại được.</p>
      <NewWeddingForm />
    </main>
  );
}
