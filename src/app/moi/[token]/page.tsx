import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/access";
import { Mark } from "@/components/mark";
import { AcceptForm } from "./accept-form";
import { formatDateVn } from "@/lib/dates";

export const metadata: Metadata = { title: "Lời mời cùng chuẩn bị" };

export default async function InvitePage({ params }: PageProps<"/moi/[token]">) {
  const { token } = await params;
  const user = await requireUser(`/moi/${token}`);
  const [row] = await db
    .select({ invite: schema.memberInvites, wedding: schema.weddings })
    .from(schema.memberInvites)
    .innerJoin(schema.weddings, eq(schema.memberInvites.weddingId, schema.weddings.id))
    .where(eq(schema.memberInvites.token, token))
    .limit(1);
  const valid = row && !row.invite.usedAt && row.invite.expiresAt.getTime() > Date.now();

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-12">
      <Mark className="h-11 w-11 text-son" />
      {valid ? (
        <>
          <h1 className="mt-6 text-[1.7rem] leading-tight font-bold">
            Cùng chuẩn bị đám cưới {row.wedding.groomName} & {row.wedding.brideName}
          </h1>
          <p className="mt-2 text-muted">
            {formatDateVn(row.wedding.weddingDate)}. Bạn tham gia với vai trò <strong className="text-ink">{ROLE_LABEL[row.invite.role]}</strong>.
          </p>
          <AcceptForm token={token} defaultName={user.name ?? ""} />
        </>
      ) : (
        <>
          <h1 className="mt-6 text-[1.6rem] font-bold">Link mời không còn dùng được</h1>
          <p className="mt-2 text-muted">Link đã được dùng hoặc đã quá 30 ngày. Nhờ cô dâu chú rể gửi link mới.</p>
        </>
      )}
    </main>
  );
}
