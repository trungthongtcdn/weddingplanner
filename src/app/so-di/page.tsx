import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { fundPermission, parentJoinedMap } from "@/lib/access";
import { PageTitle, SectionTitle, Empty, Notice } from "@/components/ui";
import { normalizeForMatch } from "@/lib/text";
import { normalizeVnPhone } from "@/lib/phone";
import { formatVnd } from "@/lib/vn-money";
import { formatDateVn } from "@/lib/dates";
import { deleteOutgoingAction } from "@/app/actions/gifts";
import { OutgoingForm } from "./outgoing-form";

export const metadata: Metadata = { title: "Sổ đi" };

export default async function OutgoingPage({ searchParams }: PageProps<"/so-di">) {
  const sp = await searchParams;
  const user = await requireUser("/so-di");
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const entries = await db.select().from(schema.outgoingGifts).where(eq(schema.outgoingGifts.userId, user.id)).orderBy(desc(schema.outgoingGifts.createdAt));

  // Tra sổ nhận: những ai từng mừng mình, trong các quỹ mình được xem.
  let received: { name: string; amount: number; itemDesc: string | null; wedding: string; date: string }[] = [];
  if (q) {
    const memberships = await db
      .select({ member: schema.members, wedding: schema.weddings })
      .from(schema.members)
      .innerJoin(schema.weddings, eq(schema.members.weddingId, schema.weddings.id))
      .where(eq(schema.members.userId, user.id));
    const nq = normalizeForMatch(q);
    const phone = normalizeVnPhone(q);
    for (const { member, wedding } of memberships) {
      const funds = await db.select().from(schema.funds).where(eq(schema.funds.weddingId, wedding.id));
      const joined = await parentJoinedMap(wedding.id);
      const visible = funds.filter((f) => fundPermission(member.role, f, joined).view).map((f) => f.id);
      if (!visible.length) continue;
      const rows = await db
        .select({ gift: schema.gifts, guest: schema.guests })
        .from(schema.gifts)
        .innerJoin(schema.guests, eq(schema.gifts.guestId, schema.guests.id))
        .where(inArray(schema.gifts.fundId, visible));
      for (const r of rows) {
        const hay = normalizeForMatch(`${r.guest.honorific ?? ""} ${r.guest.name}`);
        if ((phone && r.guest.phone === phone) || (nq && hay.includes(nq))) {
          received.push({
            name: `${r.guest.honorific ? r.guest.honorific + " " : ""}${r.guest.name}`,
            amount: r.gift.amount,
            itemDesc: r.gift.itemDesc,
            wedding: `Cưới ${wedding.groomName} & ${wedding.brideName}`,
            date: wedding.weddingDate,
          });
        }
      }
    }
    received = received.slice(0, 20);
  }
  const nq = normalizeForMatch(q);
  const myToThem = q ? entries.filter((e) => normalizeForMatch(e.personName).includes(nq)) : [];

  return (
    <main className="mx-auto max-w-lg px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-14">
      <Link href="/" className="mb-3 inline-flex min-h-10 items-center text-[0.95rem] font-medium text-son">
        ← Đám cưới của bạn
      </Link>
      <PageTitle title="Sổ đi" sub="Ghi lại những khoản bạn đã mừng người khác, và tra xem ai từng mừng mình." />

      <form className="panel space-y-2 px-4 py-4" action="/so-di">
        <label className="label" htmlFor="q">
          Ai vừa mời bạn?
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" defaultValue={q} className="field" placeholder="Tên hoặc số điện thoại" />
          <button className="btn-primary shrink-0 px-4">Tra</button>
        </div>
      </form>

      {q ? (
        <div className="mt-4 space-y-3">
          {received.length ? (
            <Notice>
              <strong>Đã từng mừng bạn:</strong>
              <ul className="mt-1">
                {received.map((r, i) => (
                  <li key={i}>
                    {r.name} — {r.itemDesc ?? formatVnd(r.amount)} ({r.wedding}, {formatDateVn(r.date, false)})
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[0.85rem]">Mức tham khảo khi đáp lễ: tương đương khoản họ đã mừng. Tuỳ tình cảm và hoàn cảnh của bạn.</p>
            </Notice>
          ) : (
            <p className="text-muted">Không thấy “{q}” trong các sổ nhận bạn được xem.</p>
          )}
          {myToThem.length ? (
            <p className="text-[0.92rem]">
              Bạn đã mừng: {myToThem.map((e) => `${e.personName} ${formatVnd(e.amount)} (${e.eventName})`).join("; ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <SectionTitle>Ghi khoản đã mừng</SectionTitle>
      <OutgoingForm
        defaults={{
          eventName: typeof sp["su-kien"] === "string" ? sp["su-kien"] : "",
          eventDate: typeof sp.ngay === "string" ? sp.ngay : "",
          personName: typeof sp.ten === "string" ? sp.ten : "",
        }}
      />

      <SectionTitle>Đã ghi · {entries.length}</SectionTitle>
      {entries.length === 0 ? (
        <Empty title="Sổ đi còn trống">Mỗi lần đi ăn cưới, ghi lại một dòng để sau này đáp lễ cho phải.</Empty>
      ) : (
        <ul className="panel rows">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{e.personName}</div>
                <div className="truncate text-[0.85rem] text-muted">
                  {e.eventName}
                  {e.eventDate ? ` · ${formatDateVn(e.eventDate, false)}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums">{formatVnd(e.amount)}</span>
                <form action={deleteOutgoingAction.bind(null, e.id)}>
                  <button className="min-h-10 px-1 text-[0.85rem] text-muted" aria-label={`Xoá khoản mừng ${e.personName}`}>
                    Xoá
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
