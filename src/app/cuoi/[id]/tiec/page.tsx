import type { Metadata } from "next";
import { getWeddingAccess, canManageWedding, SIDE_LABEL } from "@/lib/access";
import { loadParties } from "@/lib/guests-query";
import { BackLink, PageTitle, SectionTitle } from "@/components/ui";
import { formatDateTimeVn } from "@/lib/dates";
import { buildInviteMessage } from "@/lib/invite";
import { PartyForm, InviteSettingsForm } from "./forms";
import { deletePartyAction } from "@/app/actions/wedding";

export const metadata: Metadata = { title: "Tiệc và thiệp" };

export default async function PartiesPage({ params }: PageProps<"/cuoi/[id]/tiec">) {
  const { id } = await params;
  const { wedding, member } = await getWeddingAccess(id);
  const manage = canManageWedding(member.role);
  const parties = await loadParties(id);
  const sample = buildInviteMessage(wedding, { name: "Hùng", honorific: "chú" }, parties.slice(0, 1), "https://…/t/…");

  return (
    <>
      <BackLink href={`/cuoi/${id}/them`}>Thêm</BackLink>
      <PageTitle title="Tiệc và thiệp" sub="Mỗi khách chỉ thấy những tiệc họ được mời trên thiệp." />
      <div className="space-y-3">
        {parties.map((p) => (
          <details key={p.id} className="panel px-4 py-3">
            <summary className="cursor-pointer">
              <span className="font-semibold">{p.name}</span>
              <span className="block text-[0.88rem] text-muted">
                {formatDateTimeVn(p.startsAt)} · {SIDE_LABEL[p.side]}
                {p.venue ? ` · ${p.venue}` : ""}
              </span>
            </summary>
            {manage ? (
              <div className="mt-3">
                <PartyForm weddingId={id} party={p} />
                <form action={deletePartyAction.bind(null, id, p.id)} className="mt-2">
                  <button className="min-h-10 w-full text-[0.9rem] font-medium text-son">Xoá tiệc này</button>
                </form>
              </div>
            ) : (
              <p className="mt-2 text-[0.92rem] text-muted">{p.address ?? "Chưa có địa chỉ"}</p>
            )}
          </details>
        ))}
      </div>
      {manage ? (
        <>
          <SectionTitle>Thêm tiệc</SectionTitle>
          <div className="panel px-4 py-4">
            <PartyForm weddingId={id} party={null} defaultDate={wedding.weddingDate} />
          </div>
          <SectionTitle>Lời mời gửi kèm thiệp</SectionTitle>
          <InviteSettingsForm weddingId={id} message={wedding.inviteMessage ?? ""} giftQrEnabled={wedding.giftQrEnabled} sample={sample} />
        </>
      ) : null}
    </>
  );
}
