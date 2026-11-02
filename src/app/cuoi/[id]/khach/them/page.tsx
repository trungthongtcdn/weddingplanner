import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingAccess, guestSidesFor, SIDE_LABEL } from "@/lib/access";
import { loadGuests, loadParties } from "@/lib/guests-query";
import { BackLink, PageTitle } from "@/components/ui";
import { recallGroupsFor } from "@/lib/guest-groups";
import { formatDateTimeVn } from "@/lib/dates";
import { AddGuests } from "./add-guests";

export const metadata: Metadata = { title: "Thêm khách" };

export default async function AddGuestsPage({ params, searchParams }: PageProps<"/cuoi/[id]/khach/them">) {
  const { id } = await params;
  const sp = await searchParams;
  const { member } = await getWeddingAccess(id);
  const sides = guestSidesFor(member.role);
  if (!sides.length) notFound();
  const side = sides.includes(sp.ben as (typeof sides)[number]) ? (sp.ben as (typeof sides)[number]) : sides[0];
  const [guests, parties] = await Promise.all([loadGuests(id, [side]), loadParties(id)]);
  const groupCounts: Record<string, number> = {};
  for (const g of guests) if (g.groupName) groupCounts[g.groupName] = (groupCounts[g.groupName] ?? 0) + 1;
  // Mặc định gắn khách với các tiệc của đúng bên; danh sách cặp đôi thì gắn tất cả.
  const defaultParties = parties.filter((p) => side === "CAP_DOI" || p.side === side || p.side === "CAP_DOI").map((p) => p.id);

  return (
    <>
      <BackLink href={`/cuoi/${id}/khach`}>Khách mời</BackLink>
      <PageTitle title="Thêm khách" sub="Đi lần lượt từng nhóm để không sót ai." />
      <AddGuests
        weddingId={id}
        sides={sides.map((s) => ({ value: s, label: SIDE_LABEL[s] }))}
        side={side}
        groups={recallGroupsFor(side)}
        groupCounts={groupCounts}
        parties={parties.map((p) => ({ id: p.id, label: `${p.name} · ${formatDateTimeVn(p.startsAt)}` }))}
        defaultParties={defaultParties}
      />
    </>
  );
}
