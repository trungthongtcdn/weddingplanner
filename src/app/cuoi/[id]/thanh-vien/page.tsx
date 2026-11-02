import type { Metadata } from "next";
import { and, asc, eq, isNull, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, ROLE_LABEL, canManageWedding } from "@/lib/access";
import { PageTitle, SectionTitle, BackLink } from "@/components/ui";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/submit-button";
import { createInviteAction, revokeInviteAction, removeMemberAction } from "@/app/actions/wedding";
import { baseUrl } from "@/lib/url";
import { formatPhone } from "@/lib/phone";
import { MEMBER_ROLES } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Thành viên" };

const ROLE_HELP: Record<(typeof MEMBER_ROLES)[number], string> = {
  COUPLE: "Toàn quyền, xem mọi danh sách khách.",
  PARENT_GROOM: "Nhập khách nhà trai, quản lý quỹ mừng nhà trai.",
  PARENT_BRIDE: "Nhập khách nhà gái, quản lý quỹ mừng nhà gái.",
  HELPER: "Chỉ xem kế hoạch lễ và việc được giao. Không thấy khách hay tiền.",
};

export default async function MembersPage({ params }: PageProps<"/cuoi/[id]/thanh-vien">) {
  const { id } = await params;
  const { wedding, member } = await getWeddingAccess(id);
  const manage = canManageWedding(member.role);
  const members = await db
    .select({ m: schema.members, phone: schema.users.phone })
    .from(schema.members)
    .innerJoin(schema.users, eq(schema.members.userId, schema.users.id))
    .where(eq(schema.members.weddingId, id))
    .orderBy(asc(schema.members.createdAt));
  const invites = manage
    ? await db
        .select()
        .from(schema.memberInvites)
        .where(and(eq(schema.memberInvites.weddingId, id), isNull(schema.memberInvites.usedAt), gt(schema.memberInvites.expiresAt, new Date())))
        .orderBy(asc(schema.memberInvites.createdAt))
    : [];
  const origin = await baseUrl();

  return (
    <>
      <BackLink href={`/cuoi/${id}/them`}>Thêm</BackLink>
      <PageTitle title="Thành viên" sub="Mỗi người thấy đúng phần việc của mình." />
      <div className="panel rows">
        {members.map(({ m, phone }) => (
          <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium">
                {m.displayName}
                {m.id === member.id ? <span className="text-muted"> (bạn)</span> : null}
              </div>
              <div className="text-[0.85rem] text-muted">
                {ROLE_LABEL[m.role]} · {formatPhone(phone)}
              </div>
            </div>
            {manage && m.id !== member.id ? (
              <form action={removeMemberAction.bind(null, id, m.id)}>
                <button className="min-h-10 text-[0.88rem] font-medium text-son">Bỏ</button>
              </form>
            ) : null}
          </div>
        ))}
      </div>

      {manage ? (
        <>
          <SectionTitle>Mời thêm người</SectionTitle>
          <form action={createInviteAction.bind(null, id)} className="panel space-y-3 px-4 py-4">
            <fieldset className="space-y-2">
              {MEMBER_ROLES.map((r, i) => (
                <label key={r} className="flex cursor-pointer gap-3 rounded-xl border border-line px-3.5 py-2.5 has-[:checked]:border-son has-[:checked]:bg-son-tint">
                  <input type="radio" name="role" value={r} defaultChecked={i === 1} className="mt-1 accent-son" />
                  <span>
                    <span className="block font-medium">{r === "COUPLE" ? "Nửa kia của bạn" : ROLE_LABEL[r]}</span>
                    <span className="block text-[0.85rem] text-muted">{ROLE_HELP[r]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <label className="label" htmlFor="label">
                Ghi chú cho link (không bắt buộc)
              </label>
              <input id="label" name="label" className="field" placeholder="Ví dụ: Mẹ Lan" />
            </div>
            <SubmitButton pendingText="Đang tạo…">Tạo link mời</SubmitButton>
          </form>

          {invites.length ? (
            <>
              <SectionTitle>Link đang chờ</SectionTitle>
              <div className="panel rows">
                {invites.map((inv) => {
                  const url = `${origin}/moi/${inv.token}`;
                  return (
                    <div key={inv.id} className="px-4 py-3">
                      <div className="font-medium">{inv.label}</div>
                      <div className="mb-2 text-[0.85rem] text-muted">{ROLE_LABEL[inv.role]} · dùng được 1 lần trong 30 ngày</div>
                      <div className="flex gap-2">
                        <ShareButton
                          text={`${wedding.groomName} & ${wedding.brideName} mời ${inv.label.toLowerCase()} cùng chuẩn bị đám cưới trên Trăm Năm. Bấm link và đăng nhập bằng số điện thoại:`}
                          url={url}
                          label="Gửi qua Zalo"
                          className="btn-primary btn-sm flex-1"
                        />
                        <form action={revokeInviteAction.bind(null, id, inv.id)}>
                          <button className="btn-quiet btn-sm">Huỷ</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
