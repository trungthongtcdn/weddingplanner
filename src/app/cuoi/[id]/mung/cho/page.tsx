import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess } from "@/lib/access";
import { resolveFunds } from "@/lib/funds";
import { BackLink, PageTitle, Empty } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { suggestGuests } from "@/lib/matching";
import { formatVnd } from "@/lib/vn-money";
import { AssignGift } from "./assign-gift";

export const metadata: Metadata = { title: "Ai đây?" };

export default async function QueuePage({ params, searchParams }: PageProps<"/cuoi/[id]/mung/cho">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  const { funds, current } = await resolveFunds(access, sp.quy);
  if (!current || !current.perm.manage) notFound();
  const fund = current.fund;
  const pending = await db
    .select()
    .from(schema.gifts)
    .where(and(eq(schema.gifts.fundId, fund.id), eq(schema.gifts.matchStatus, "UNMATCHED")));
  const guests = await db
    .select({ id: schema.guests.id, name: schema.guests.name, honorific: schema.guests.honorific, groupName: schema.guests.groupName, giftCode: schema.guests.giftCode })
    .from(schema.guests)
    .where(and(eq(schema.guests.weddingId, id), eq(schema.guests.side, fund.side)));
  const options = guests
    .map((g) => ({ id: g.id, label: `${g.honorific ? g.honorific + " " : ""}${g.name}${g.groupName ? ` · ${g.groupName}` : ""}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));

  return (
    <>
      <BackLink href={`/cuoi/${id}/mung?quy=${fund.id}`}>Sổ mừng</BackLink>
      <PageTitle title="Ai đây?" sub="Những khoản chưa tự khớp được. Chọn đúng khách, hoặc đánh dấu không rõ." />
      <FundTabs funds={funds.filter((f) => f.perm.manage)} currentId={fund.id} path={`/cuoi/${id}/mung/cho`} />
      {pending.length === 0 ? (
        <Empty title="Không còn khoản nào chờ xác nhận" />
      ) : (
        <div className="space-y-3">
          {pending.map((g) => {
            const sugg = suggestGuests(`${g.rawText ?? ""} ${g.note ?? ""}`, guests, 3).map((s) => ({
              guestId: s.guestId,
              label: options.find((o) => o.id === s.guestId)?.label ?? "",
              reason: s.reason,
            }));
            return (
              <div key={g.id} className="panel px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[1.15rem] font-bold tabular-nums">{g.itemDesc ?? formatVnd(g.amount)}</span>
                  <span className="text-[0.82rem] text-muted">{g.method === "CHUYEN_KHOAN" ? "Chuyển khoản" : "Phong bì"}{g.receivedAt ? ` · ${g.receivedAt}` : ""}</span>
                </div>
                {g.rawText ? <p className="mt-1 rounded-lg bg-paper px-3 py-2 text-[0.88rem] break-words">{g.rawText}</p> : null}
                <AssignGift weddingId={id} giftId={g.id} suggestions={sugg} options={options} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
