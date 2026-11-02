import type { Metadata } from "next";
import { getWeddingAccess, canSeeBudget, canManageWedding } from "@/lib/access";
import { PageTitle, RowLink } from "@/components/ui";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Thêm" };

export default async function MorePage({ params }: PageProps<"/cuoi/[id]/them">) {
  const { id } = await params;
  const { member } = await getWeddingAccess(id);
  const base = `/cuoi/${id}`;
  const items: [string, string, string][] = [
    [`${base}/viec`, "Việc cần làm", "Checklist theo từng lễ, giao việc cho người thân"],
    ...(canSeeBudget(member.role) ? ([[`${base}/ngan-sach`, "Ngân sách", "Chia theo bên chi: nhà trai, nhà gái, cặp đôi"]] as [string, string, string][]) : []),
    [`${base}/tiec`, "Tiệc và thiệp", "Giờ, địa điểm từng tiệc, lời mời trên thiệp"],
    [`${base}/thanh-vien`, "Thành viên", "Mời bố mẹ hai bên và người hỗ trợ"],
    ...(canManageWedding(member.role) ? ([[`${base}/thong-tin`, "Thông tin đám cưới", "Tên, quê, ngày cưới"]] as [string, string, string][]) : []),
    ["/so-di", "Sổ đi của tôi", "Những khoản bạn đã mừng người khác"],
  ];
  return (
    <>
      <PageTitle title="Thêm" />
      <div className="panel rows">
        {items.map(([href, title, sub]) => (
          <RowLink key={href} href={href}>
            <div className="font-medium">{title}</div>
            <div className="text-[0.85rem] text-muted">{sub}</div>
          </RowLink>
        ))}
      </div>
      <form action={logoutAction} className="mt-6">
        <button className="btn-quiet w-full">Đăng xuất</button>
      </form>
    </>
  );
}
