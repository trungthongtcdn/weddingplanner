import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingAccess } from "@/lib/access";
import { resolveFunds, FUND_LABEL } from "@/lib/funds";
import { BackLink, PageTitle, SectionTitle } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { BANKS } from "@/lib/vietqr";
import { BankForm, SharingToggle } from "./forms";

export const metadata: Metadata = { title: "Tài khoản nhận mừng" };

export default async function FundSettingsPage({ params, searchParams }: PageProps<"/cuoi/[id]/mung/quy">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  const { funds, current } = await resolveFunds(access, sp.quy);
  if (!current) notFound();
  const { fund, perm } = current;
  const isOwnerParent =
    (fund.side === "NHA_TRAI" && access.member.role === "PARENT_GROOM") || (fund.side === "NHA_GAI" && access.member.role === "PARENT_BRIDE");
  if (!perm.manage && !isOwnerParent) notFound();

  return (
    <>
      <BackLink href={`/cuoi/${id}/mung?quy=${fund.id}`}>Sổ mừng</BackLink>
      <PageTitle title={FUND_LABEL[fund.side]} sub="Tài khoản nhận chuyển khoản mừng của khách thuộc danh sách này." />
      <FundTabs funds={funds.filter((f) => f.perm.manage)} currentId={fund.id} path={`/cuoi/${id}/mung/quy`} />
      {perm.manage ? (
        <BankForm
          weddingId={id}
          fundId={fund.id}
          banks={BANKS}
          initial={{ bankBin: fund.bankBin ?? "", accountNumber: fund.accountNumber ?? "", accountName: fund.accountName ?? "" }}
        />
      ) : null}
      {isOwnerParent ? (
        <>
          <SectionTitle>Quyền xem của cặp đôi</SectionTitle>
          <SharingToggle weddingId={id} fundId={fund.id} coupleCanView={fund.coupleCanView} />
        </>
      ) : null}
    </>
  );
}
