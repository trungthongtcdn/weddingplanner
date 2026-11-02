import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess } from "@/lib/access";
import { resolveFunds } from "@/lib/funds";
import { BackLink, PageTitle, Empty, SectionTitle } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { buildThankYouMessage } from "@/lib/invite";
import { ThankRow } from "./thank-row";

export const metadata: Metadata = { title: "Cảm ơn khách" };

export default async function ThanksPage({ params, searchParams }: PageProps<"/cuoi/[id]/mung/cam-on">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  const { funds, current } = await resolveFunds(access, sp.quy);
  if (!current || !current.perm.manage) notFound();
  const fund = current.fund;
  const rows = await db
    .select({ guest: schema.guests })
    .from(schema.gifts)
    .innerJoin(schema.guests, eq(schema.gifts.guestId, schema.guests.id))
    .where(eq(schema.gifts.fundId, fund.id));
  const unique = [...new Map(rows.map((r) => [r.guest.id, r.guest])).values()];
  const todo = unique.filter((g) => !g.thankedAt);
  const done = unique.filter((g) => g.thankedAt);
  const sender =
    fund.side === "CAP_DOI"
      ? `${access.wedding.groomName} và ${access.wedding.brideName}`
      : `Gia đình ${fund.side === "NHA_TRAI" ? "nhà trai" : "nhà gái"}`;

  return (
    <>
      <BackLink href={`/cuoi/${id}/mung?quy=${fund.id}`}>Sổ mừng</BackLink>
      <PageTitle title="Cảm ơn khách" sub="Lời cảm ơn soạn sẵn theo từng người, gửi từ Zalo của bạn." />
      <FundTabs funds={funds.filter((f) => f.perm.manage)} currentId={fund.id} path={`/cuoi/${id}/mung/cam-on`} />
      {unique.length === 0 ? (
        <Empty title="Chưa có khách nào trong sổ">Khi khoản mừng đã gắn với khách, họ sẽ hiện ở đây.</Empty>
      ) : (
        <>
          <SectionTitle>Chưa cảm ơn · {todo.length}</SectionTitle>
          <ul className="panel rows">
            {todo.map((g) => (
              <ThankRow
                key={g.id}
                weddingId={id}
                fundId={fund.id}
                guestId={g.id}
                name={`${g.honorific ? g.honorific + " " : ""}${g.name}`}
                phone={g.phone}
                message={buildThankYouMessage(access.wedding, g, sender)}
              />
            ))}
            {todo.length === 0 ? <li className="px-4 py-3 text-muted">Đã cảm ơn hết.</li> : null}
          </ul>
          {done.length ? (
            <p className="mt-3 text-[0.88rem] text-muted">Đã cảm ơn {done.length} người: {done.map((g) => g.name).slice(0, 8).join(", ")}{done.length > 8 ? "…" : ""}</p>
          ) : null}
        </>
      )}
    </>
  );
}
