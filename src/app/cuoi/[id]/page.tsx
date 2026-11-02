import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { canSeeGuests, getWeddingAccess, guestSidesFor, visibleFunds, canManageWedding, parentJoinedMap } from "@/lib/access";
import { weddingDateNotes } from "@/lib/lunar";
import { Notice, SectionTitle, Stat, RowLink } from "@/components/ui";
import { formatDateVn, todayVn, daysBetween } from "@/lib/dates";
import { formatVndShort } from "@/lib/vn-money";
import { differencesBetween, CEREMONY_LABEL } from "@/lib/rituals";

export default async function WeddingHome({ params }: PageProps<"/cuoi/[id]">) {
  const { id } = await params;
  const access = await getWeddingAccess(id);
  const { wedding, member } = access;
  const role = member.role;

  const notes = weddingDateNotes(wedding.weddingDate, wedding.brideBirthYear);

  const taskRows = await db
    .select()
    .from(schema.tasks)
    .where(
      role === "HELPER"
        ? and(eq(schema.tasks.weddingId, id), eq(schema.tasks.assigneeMemberId, member.id))
        : eq(schema.tasks.weddingId, id),
    )
    .orderBy(asc(schema.tasks.dueDate));
  const openTasks = taskRows.filter((t) => !t.done);
  const doneCount = taskRows.length - openTasks.length;
  const today = todayVn();

  let guestStats: { total: number; invited: number; sent: number; coming: number } | null = null;
  if (canSeeGuests(role)) {
    const sides = guestSidesFor(role);
    const guests = await db
      .select({ status: schema.guests.status, callResult: schema.guests.callResult })
      .from(schema.guests)
      .where(and(eq(schema.guests.weddingId, id), inArray(schema.guests.side, sides)));
    guestStats = {
      total: guests.length,
      invited: guests.filter((g) => g.status !== "CHUA_MOI").length,
      sent: guests.filter((g) => ["DA_GUI_THIEP", "DA_MO", "CO_MAT", "DA_MUNG"].includes(g.status)).length,
      coming: guests.filter((g) => g.callResult === "SE_DI").length,
    };
  }

  const funds = canSeeGuests(role) ? await visibleFunds(access) : [];
  let giftTotal = 0;
  if (funds.length) {
    const gifts = await db
      .select({ amount: schema.gifts.amount })
      .from(schema.gifts)
      .where(inArray(schema.gifts.fundId, funds.map((f) => f.fund.id)));
    giftTotal = gifts.reduce((s, g) => s + g.amount, 0);
  }

  const diffs = differencesBetween(wedding.groomRegion, wedding.brideRegion);
  const decided = diffs.length
    ? await db.select().from(schema.decisions).where(and(eq(schema.decisions.weddingId, id), eq(schema.decisions.confirmed, true)))
    : [];
  const pendingDiffs = diffs.filter((d) => !decided.some((x) => x.key === d.key)).length;

  const joined = canManageWedding(role) ? await parentJoinedMap(id) : null;
  const base = `/cuoi/${id}`;

  return (
    <>
      <div className="space-y-2">
        {notes.map((n, i) => (
          <Notice key={i} tone={n.kind === "caution" ? "caution" : "info"}>
            {n.text}
          </Notice>
        ))}
        {notes.some((n) => n.kind === "caution") ? (
          <p className="text-[0.82rem] text-muted">Các lưu ý trên theo quan niệm phổ biến, chỉ để tham khảo khi gia đình chọn ngày.</p>
        ) : null}
      </div>

      {joined && (!joined.NHA_TRAI || !joined.NHA_GAI) ? (
        <Link href={`${base}/thanh-vien`} className="mt-4 block rounded-xl border border-son/25 bg-son-tint px-4 py-3.5">
          <div className="font-semibold text-son-dark">Mời bố mẹ hai bên cùng chuẩn bị</div>
          <div className="text-[0.9rem] text-ink/80">
            Bố mẹ {!joined.NHA_TRAI && !joined.NHA_GAI ? "hai bên" : !joined.NHA_TRAI ? "nhà trai" : "nhà gái"} chưa tham gia. Gửi link qua Zalo để bố mẹ tự nhập khách của mình.
          </div>
        </Link>
      ) : null}

      {pendingDiffs > 0 && role !== "HELPER" ? (
        <Link href={`${base}/le#khac-biet`} className="mt-3 block rounded-xl border border-kim/40 bg-kim-tint px-4 py-3.5">
          <div className="font-semibold">{pendingDiffs} điểm phong tục cần hai nhà chốt</div>
          <div className="text-[0.9rem] text-ink/80">Quê hai bên khác vùng — xem chỗ khác nhau và chọn cách làm.</div>
        </Link>
      ) : null}

      {guestStats ? (
        <>
          <SectionTitle action={<Link href={`${base}/khach`} className="text-[0.9rem] font-medium text-son">Xem khách</Link>}>
            Khách mời
          </SectionTitle>
          <div className="panel grid grid-cols-4 gap-2 px-4 py-4">
            <Stat value={guestStats.total} label="Khách" />
            <Stat value={guestStats.invited} label="Đã mời" />
            <Stat value={guestStats.sent} label="Có thiệp" />
            <Stat value={guestStats.coming} label="Sẽ đi" />
          </div>
        </>
      ) : null}

      {funds.length ? (
        <>
          <SectionTitle action={<Link href={`${base}/mung`} className="text-[0.9rem] font-medium text-son">Mở sổ</Link>}>
            Sổ mừng
          </SectionTitle>
          <div className="panel px-4 py-4">
            <Stat value={formatVndShort(giftTotal)} label={`Tổng đã ghi nhận · ${funds.map((f) => (f.fund.side === "CAP_DOI" ? "quỹ cặp đôi" : f.fund.side === "NHA_TRAI" ? "nhà trai" : "nhà gái")).join(", ")}`} />
          </div>
        </>
      ) : null}

      <SectionTitle action={<Link href={`${base}/viec`} className="text-[0.9rem] font-medium text-son">Tất cả việc</Link>}>
        {role === "HELPER" ? "Việc của bạn" : "Việc sắp tới"}
      </SectionTitle>
      {taskRows.length ? (
        <>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={doneCount} aria-valuemax={taskRows.length} aria-label="Tiến độ việc">
            <div className="h-full rounded-full bg-moss" style={{ width: `${(doneCount / taskRows.length) * 100}%` }} />
          </div>
          <p className="mb-3 text-[0.88rem] text-muted">
            Xong {doneCount}/{taskRows.length} việc
          </p>
          <div className="panel rows">
            {openTasks.slice(0, 4).map((t) => {
              const late = t.dueDate && t.dueDate < today;
              return (
                <RowLink key={t.id} href={`${base}/viec#${t.id}`}>
                  <div className="font-medium">{t.title}</div>
                  <div className={`text-[0.85rem] ${late ? "font-medium text-son" : "text-muted"}`}>
                    {t.ceremony !== "CHUNG" ? `${CEREMONY_LABEL[t.ceremony]} · ` : ""}
                    {t.dueDate ? (late ? `Quá hạn ${daysBetween(t.dueDate, today)} ngày` : `Hạn ${formatDateVn(t.dueDate, false)}`) : "Chưa đặt hạn"}
                  </div>
                </RowLink>
              );
            })}
            {openTasks.length === 0 ? <p className="px-4 py-4 text-muted">Đã xong hết việc.</p> : null}
          </div>
        </>
      ) : (
        <p className="text-muted">Chưa có việc nào được giao cho bạn.</p>
      )}
    </>
  );
}
