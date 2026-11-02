import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { Mark } from "@/components/mark";
import { formatDateVn } from "@/lib/dates";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const rows = await db
      .select({ wedding: schema.weddings })
      .from(schema.members)
      .innerJoin(schema.weddings, eq(schema.members.weddingId, schema.weddings.id))
      .where(eq(schema.members.userId, user.id));
    if (rows.length === 0) redirect("/bat-dau");
    if (rows.length === 1) redirect(`/cuoi/${rows[0].wedding.id}`);
    return (
      <main className="mx-auto max-w-md px-5 pt-10 pb-12">
        <h1 className="mb-5 text-[1.6rem] font-bold">Đám cưới của bạn</h1>
        <div className="panel rows">
          {rows.map(({ wedding }) => (
            <Link key={wedding.id} href={`/cuoi/${wedding.id}`} className="block px-4 py-3.5">
              <div className="font-semibold">
                {wedding.groomName} & {wedding.brideName}
              </div>
              <div className="text-[0.9rem] text-muted">{formatDateVn(wedding.weddingDate)}</div>
            </Link>
          ))}
        </div>
        <Link href="/bat-dau" className="btn-quiet mt-4 w-full">
          Tạo đám cưới khác
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <Mark className="h-12 w-12 text-son" />
      <h1 className="mt-8 text-[2.35rem] leading-[1.08] font-bold tracking-[-0.02em]">
        Cưới hỏi đủ lễ,
        <br />
        hai họ cùng lo.
      </h1>
      <p className="mt-4 text-[1.05rem] text-muted">
        Trăm Năm giúp cô dâu chú rể và bố mẹ hai bên chuẩn bị lễ truyền thống, mời khách và ghi sổ mừng trên cùng một chỗ.
      </p>

      <dl className="mt-9 space-y-5 border-l-2 border-kim pl-4">
        <div>
          <dt className="font-semibold">Kế hoạch lễ theo quê hai bên</dt>
          <dd className="text-[0.95rem] text-muted">Dạm ngõ, ăn hỏi, lễ cưới, lại mặt — chỉ ra chỗ phong tục hai vùng khác nhau để gia đình chốt.</dd>
        </div>
        <div>
          <dt className="font-semibold">Không sót khách</dt>
          <dd className="text-[0.95rem] text-muted">Gợi nhớ theo nhóm, bố mẹ tự nhập khách của mình, gọi mời rồi gửi thiệp qua Zalo.</dd>
        </div>
        <div>
          <dt className="font-semibold">Sổ mừng tự đối soát</dt>
          <dd className="text-[0.95rem] text-muted">Ghi phong bì bằng giọng nói, khớp chuyển khoản theo mã khách. Tiền vào thẳng tài khoản của bạn.</dd>
        </div>
      </dl>

      <div className="mt-auto space-y-3 pt-10">
        <Link href="/dang-nhap?next=/bat-dau" className="btn-primary w-full">
          Bắt đầu chuẩn bị
        </Link>
        <Link href="/dang-nhap" className="btn-quiet w-full">
          Tôi đã có tài khoản
        </Link>
      </div>
    </main>
  );
}
