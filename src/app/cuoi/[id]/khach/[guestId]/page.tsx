import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, guestSidesFor, SIDE_LABEL, visibleFunds } from "@/lib/access";
import { loadGuests, loadParties } from "@/lib/guests-query";
import { BackLink, SectionTitle, Notice } from "@/components/ui";
import { STATUS_LABEL, STATUS_ORDER, CALL_LABEL } from "@/lib/guest-status";
import { buildInviteMessage } from "@/lib/invite";
import { baseUrl } from "@/lib/url";
import { formatPhone } from "@/lib/phone";
import { formatDateTimeVn } from "@/lib/dates";
import { formatVnd } from "@/lib/vn-money";
import { GuestActions } from "./guest-actions";
import { GuestEditForm } from "./guest-edit-form";

export const metadata: Metadata = { title: "Khách" };

export default async function GuestPage({ params }: PageProps<"/cuoi/[id]/khach/[guestId]">) {
  const { id, guestId } = await params;
  const access = await getWeddingAccess(id);
  const { wedding, member } = access;
  const sides = guestSidesFor(member.role);
  const guests = await loadGuests(id, sides);
  const g = guests.find((x) => x.id === guestId);
  if (!g) notFound();
  const parties = await loadParties(id);
  const origin = await baseUrl();
  const myParties = parties.filter((p) => g.partyIds.includes(p.id));
  const url = `${origin}/t/${g.inviteToken}`;
  const message = buildInviteMessage(wedding, g, myParties.length ? myParties : parties, url);
  const samePhone = g.phone
    ? await db
        .select({ id: schema.guests.id, name: schema.guests.name, side: schema.guests.side })
        .from(schema.guests)
        .where(and(eq(schema.guests.weddingId, id), eq(schema.guests.phone, g.phone)))
    : [];
  const others = samePhone.filter((x) => x.id !== g.id);

  const funds = await visibleFunds(access);
  const gifts = funds.length
    ? await db
        .select()
        .from(schema.gifts)
        .where(and(eq(schema.gifts.guestId, g.id), inArray(schema.gifts.fundId, funds.map((f) => f.fund.id))))
    : [];
  const stepIndex = STATUS_ORDER.indexOf(g.status);

  return (
    <>
      <BackLink href={`/cuoi/${id}/khach`}>Khách mời</BackLink>
      <h1 className="text-[1.6rem] leading-tight font-bold">
        {g.honorific ? <span className="font-medium text-muted">{g.honorific} </span> : null}
        {g.name}
      </h1>
      <p className="mt-1 text-muted">
        {g.groupName ?? "Chưa xếp nhóm"} · danh sách {SIDE_LABEL[g.side].toLowerCase()}
        {g.phone ? ` · ${formatPhone(g.phone)}` : ""}
      </p>

      {others.length ? (
        <div className="mt-3">
          <Notice tone="caution">
            Số này cũng có trong danh sách: {others.map((o) => `${o.name} (${SIDE_LABEL[o.side].toLowerCase()})`).join(", ")}. Xoá bớt một bên để không mời hai lần.
          </Notice>
        </div>
      ) : null}

      <ol className="mt-5 flex gap-1" aria-label="Tiến trình mời">
        {STATUS_ORDER.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-son" : "bg-line"}`} />
            <div className={`mt-1 text-[0.68rem] leading-tight ${i === stepIndex ? "font-semibold text-son" : "text-muted"}`}>{STATUS_LABEL[s]}</div>
          </li>
        ))}
      </ol>
      {g.callResult ? <p className="mt-2 text-[0.92rem]">Kết quả gọi: <strong>{CALL_LABEL[g.callResult]}</strong></p> : null}

      <SectionTitle>Mời</SectionTitle>
      <GuestActions weddingId={id} guestId={g.id} phone={g.phone} message={message} sent={Boolean(g.sentAt)} attended={STATUS_ORDER.indexOf(g.status) >= STATUS_ORDER.indexOf("CO_MAT")} />
      <p className="mt-2 text-[0.85rem] text-muted">
        <Link href={`/t/${g.inviteToken}?xem-truoc=1`} className="font-medium text-son" target="_blank">
          Xem thiệp của khách này
        </Link>
        {g.openedAt ? " · khách đã mở thiệp" : ""}
      </p>

      {gifts.length ? (
        <>
          <SectionTitle>Đã mừng</SectionTitle>
          <ul className="panel rows">
            {gifts.map((x) => (
              <li key={x.id} className="flex justify-between px-4 py-2.5">
                <span>{x.method === "CHUYEN_KHOAN" ? "Chuyển khoản" : x.method === "PHONG_BI" ? "Phong bì" : "Hiện vật"}</span>
                <span className="font-medium tabular-nums">{x.itemDesc ?? formatVnd(x.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <SectionTitle>Mời dự</SectionTitle>
      <p className="mb-2 text-[0.92rem] text-muted">
        {myParties.length ? myParties.map((p) => `${p.name} (${formatDateTimeVn(p.startsAt)})`).join("; ") : "Chưa gắn với tiệc nào — thiệp sẽ hiện tất cả tiệc."}
      </p>

      <SectionTitle>Thông tin</SectionTitle>
      <GuestEditForm
        weddingId={id}
        guest={{ id: g.id, name: g.name, honorific: g.honorific, phone: g.phone, groupName: g.groupName, note: g.note, side: g.side, partyIds: g.partyIds }}
        sides={sides.map((s) => ({ value: s, label: SIDE_LABEL[s] }))}
        parties={parties.map((p) => ({ id: p.id, label: `${p.name} · ${formatDateTimeVn(p.startsAt)}` }))}
      />
    </>
  );
}
