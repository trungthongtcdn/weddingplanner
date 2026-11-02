import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingAccess } from "@/lib/access";
import { resolveFunds, FUND_LABEL } from "@/lib/funds";
import { BackLink, PageTitle } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { EnvelopeEntry } from "./envelope-entry";

export const metadata: Metadata = { title: "Bóc phong bì" };

export default async function EnvelopePage({ params, searchParams }: PageProps<"/cuoi/[id]/mung/phong-bi">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  const { funds, current } = await resolveFunds(access, sp.quy);
  if (!current || !current.perm.manage) notFound();
  const managed = funds.filter((f) => f.perm.manage);
  return (
    <>
      <BackLink href={`/cuoi/${id}/mung?quy=${current.fund.id}`}>Sổ mừng</BackLink>
      <PageTitle title="Bóc phong bì" sub={`Ghi vào ${FUND_LABEL[current.fund.side].toLowerCase()}. Đọc to hoặc gõ: “chú Hùng hàng xóm năm trăm”.`} />
      <FundTabs funds={managed} currentId={current.fund.id} path={`/cuoi/${id}/mung/phong-bi`} />
      <EnvelopeEntry weddingId={id} fundId={current.fund.id} />
    </>
  );
}
