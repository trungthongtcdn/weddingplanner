import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingAccess, guestSidesFor } from "@/lib/access";
import { loadGuests, loadParties } from "@/lib/guests-query";
import { BackLink, PageTitle, Empty } from "@/components/ui";
import { buildInviteMessage } from "@/lib/invite";
import { baseUrl } from "@/lib/url";
import { CallQueue } from "./call-queue";

export const metadata: Metadata = { title: "Gọi mời" };

export default async function CallPage({ params }: PageProps<"/cuoi/[id]/khach/goi">) {
  const { id } = await params;
  const { wedding, member } = await getWeddingAccess(id);
  const sides = guestSidesFor(member.role);
  if (!sides.length) notFound();
  const [guests, parties, origin] = await Promise.all([loadGuests(id, sides), loadParties(id), baseUrl()]);
  // Chưa gọi trước, rồi tới người không nghe máy cần gọi lại.
  const queue = guests
    .filter((g) => g.phone && (g.status === "CHUA_MOI" || g.callResult === "KHONG_NGHE"))
    .sort((a, b) => Number(a.callResult === "KHONG_NGHE") - Number(b.callResult === "KHONG_NGHE"))
    .map((g) => {
      const gp = parties.filter((p) => g.partyIds.includes(p.id));
      return {
        id: g.id,
        name: g.name,
        honorific: g.honorific,
        groupName: g.groupName,
        phone: g.phone!,
        retry: g.callResult === "KHONG_NGHE",
        message: buildInviteMessage(wedding, g, gp.length ? gp : parties.filter((p) => p.side === g.side || g.side === "CAP_DOI"), `${origin}/t/${g.inviteToken}`),
      };
    });

  return (
    <>
      <BackLink href={`/cuoi/${id}/khach`}>Khách mời</BackLink>
      <PageTitle title="Gọi mời" sub="Gọi trước cho phải phép, rồi gửi thiệp qua Zalo ngay sau cuộc gọi." />
      {queue.length ? (
        <CallQueue weddingId={id} queue={queue} />
      ) : (
        <Empty title="Không còn ai cần gọi">Những khách đã gọi hoặc chưa có số điện thoại không nằm trong danh sách này.</Empty>
      )}
    </>
  );
}
