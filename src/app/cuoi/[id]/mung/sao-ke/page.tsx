import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingAccess } from "@/lib/access";
import { resolveFunds, FUND_LABEL } from "@/lib/funds";
import { BackLink, PageTitle } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { StatementImport } from "./statement-import";

export const metadata: Metadata = { title: "Nhập sao kê" };

export default async function StatementPage({ params, searchParams }: PageProps<"/cuoi/[id]/mung/sao-ke">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  const { funds, current } = await resolveFunds(access, sp.quy);
  if (!current || !current.perm.manage) notFound();
  return (
    <>
      <BackLink href={`/cuoi/${id}/mung?quy=${current.fund.id}`}>Sổ mừng</BackLink>
      <PageTitle title="Nhập sao kê" sub={`Khoản tiền vào sẽ được ghi vào ${FUND_LABEL[current.fund.side].toLowerCase()} và tự khớp với khách.`} />
      <FundTabs funds={funds.filter((f) => f.perm.manage)} currentId={current.fund.id} path={`/cuoi/${id}/mung/sao-ke`} />
      <StatementImport weddingId={id} fundId={current.fund.id} />
    </>
  );
}
