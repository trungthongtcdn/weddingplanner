import type { Metadata } from "next";
import Link from "next/link";
import { getWeddingAccess, guestSidesFor, SIDE_LABEL, canSeeGuests } from "@/lib/access";
import { notFound } from "next/navigation";
import { loadGuests, loadParties } from "@/lib/guests-query";
import { PageTitle, SectionTitle, Empty, Notice } from "@/components/ui";
import { STATUS_LABEL, CALL_LABEL, estimateAttendance } from "@/lib/guest-status";
import { findDuplicatePhones } from "@/lib/matching";
import { formatPhone } from "@/lib/phone";
import { matchesQuery } from "@/lib/text";
import { formatDateTimeVn } from "@/lib/dates";
import type { GuestStatus, Side } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Khách mời" };

const STATUS_TONE: Record<GuestStatus, string> = {
  CHUA_MOI: "bg-paper text-muted border border-line",
  DA_GOI: "bg-kim-tint text-[#6b4d12]",
  DA_GUI_THIEP: "bg-son-tint text-son-dark",
  DA_MO: "bg-son-tint text-son-dark",
  CO_MAT: "bg-moss-tint text-moss",
  DA_MUNG: "bg-moss-tint text-moss",
};

export default async function GuestsPage({ params, searchParams }: PageProps<"/cuoi/[id]/khach">) {
  const { id } = await params;
  const sp = await searchParams;
  const { member } = await getWeddingAccess(id);
  if (!canSeeGuests(member.role)) notFound();
  const sides = guestSidesFor(member.role);
  const sideFilter = sides.includes(sp.ben as Side) ? (sp.ben as Side) : null;
  const statusFilter = typeof sp.tt === "string" && sp.tt in STATUS_LABEL ? (sp.tt as GuestStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [all, parties] = await Promise.all([loadGuests(id, sides), loadParties(id)]);
  const dups = findDuplicatePhones(all);
  const list = all.filter(
    (g) =>
      (!sideFilter || g.side === sideFilter) &&
      (!statusFilter || g.status === statusFilter) &&
      (!q || matchesQuery(`${g.honorific ?? ""} ${g.name} ${g.groupName ?? ""} ${g.phone ?? ""}`, q)),
  );
  const base = `/cuoi/${id}/khach`;
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur = { ben: sideFilter, tt: statusFilter, q: q || null, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const groups = [...new Set(list.map((g) => g.groupName ?? "Chưa xếp nhóm"))];

  return (
    <>
      <PageTitle
        title="Khách mời"
        sub={`${all.length} khách${sides.length === 1 ? ` · danh sách ${SIDE_LABEL[sides[0]].toLowerCase()}` : ""}`}
        action={
          <Link href={`${base}/them`} className="btn-primary btn-sm">
            Thêm khách
          </Link>
        }
      />

      {all.length ? (
        <Link href={`${base}/goi`} className="mb-4 flex items-center justify-between rounded-xl border border-son/25 bg-son-tint px-4 py-3.5">
          <span>
            <span className="block font-semibold text-son-dark">Gọi mời từng người</span>
            <span className="block text-[0.88rem] text-ink/80">
              {all.filter((g) => g.status === "CHUA_MOI" && g.phone).length} người chưa gọi · gọi xong gửi thiệp Zalo ngay
            </span>
          </span>
          <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" className="text-son">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}

      {dups.size ? (
        <div className="mb-4">
          <Notice tone="caution">
            <strong>{dups.size} số điện thoại có mặt ở nhiều danh sách.</strong>{" "}
            {[...dups.values()]
              .slice(0, 3)
              .map((gs) => gs.map((g) => `${g.name} (${SIDE_LABEL[g.side].toLowerCase()})`).join(" và "))
              .join("; ")}
            . Mở từng khách để giữ ở một danh sách.
          </Notice>
        </div>
      ) : null}

      {parties.length && all.length ? (
        <details className="panel mb-4 px-4 py-3">
          <summary className="cursor-pointer font-semibold">Ước lượng số khách đến</summary>
          <ul className="mt-2 space-y-3">
            {parties.map((p) => {
              const invited = all.filter((g) => g.partyIds.includes(p.id));
              const e = estimateAttendance(invited, p.seatsPerTable);
              return (
                <li key={p.id} className="text-[0.93rem]">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted">{formatDateTimeVn(p.startsAt)}</div>
                  <div className="mt-1 tabular-nums">
                    {e.invited} người được mời · ước lượng <strong>{e.low}–{e.high}</strong> người đến ·{" "}
                    <strong>
                      {e.tablesLow}–{e.tablesHigh}
                    </strong>{" "}
                    mâm/bàn {p.seatsPerTable} người
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="hint mt-3">
            Ước lượng: thấp = người đã nói “sẽ đi”; cao = cộng thêm người chưa chắc hoặc chưa trả lời. Người nói không đi được không tính. Khách chưa gắn với tiệc nào thì không tính.
          </p>
        </details>
      ) : null}

      <form className="mb-3" action={base}>
        {sideFilter ? <input type="hidden" name="ben" value={sideFilter} /> : null}
        {statusFilter ? <input type="hidden" name="tt" value={statusFilter} /> : null}
        <input type="search" name="q" defaultValue={q} placeholder="Tìm theo tên, nhóm, số điện thoại" className="field" aria-label="Tìm khách" />
      </form>

      <div className="-mx-5 mb-4 overflow-x-auto px-5">
        <div className="flex min-w-max gap-2">
          {sides.length > 1 ? (
            <>
              <Link href={qs({ ben: null })} className={`chip min-h-9 border px-3 ${!sideFilter ? "border-son bg-son text-white" : "border-line bg-surface"}`}>
                Tất cả
              </Link>
              {sides.map((s) => (
                <Link key={s} href={qs({ ben: s })} className={`chip min-h-9 border px-3 ${sideFilter === s ? "border-son bg-son text-white" : "border-line bg-surface"}`}>
                  {SIDE_LABEL[s]}
                </Link>
              ))}
              <span className="mx-1 w-px bg-line" />
            </>
          ) : null}
          {(Object.keys(STATUS_LABEL) as GuestStatus[]).map((s) => (
            <Link
              key={s}
              href={qs({ tt: statusFilter === s ? null : s })}
              className={`chip min-h-9 border px-3 ${statusFilter === s ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
      </div>

      {all.length === 0 ? (
        <Empty
          title="Chưa có khách nào"
          action={
            <Link href={`${base}/them`} className="btn-primary">
              Bắt đầu lập danh sách
            </Link>
          }
        >
          Trăm Năm sẽ hỏi lần lượt từng nhóm — họ nội, họ ngoại, hàng xóm, bạn cấp 1… — để không sót ai.
        </Empty>
      ) : list.length === 0 ? (
        <p className="text-muted">Không có khách nào khớp bộ lọc.</p>
      ) : (
        groups.map((group) => (
          <section key={group}>
            <SectionTitle>
              {group} <span className="font-normal text-muted">· {list.filter((g) => (g.groupName ?? "Chưa xếp nhóm") === group).length}</span>
            </SectionTitle>
            <ul className="panel rows">
              {list
                .filter((g) => (g.groupName ?? "Chưa xếp nhóm") === group)
                .map((g) => (
                  <li key={g.id}>
                    <Link href={`${base}/${g.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {g.honorific ? <span className="font-normal text-muted">{g.honorific} </span> : null}
                          {g.name}
                          {g.phone && dups.has(g.phone) ? <span className="ml-1.5 text-amber" title="Trùng số điện thoại">●</span> : null}
                        </div>
                        <div className="truncate text-[0.85rem] text-muted">
                          {g.phone ? formatPhone(g.phone) : "Chưa có số"}
                          {sides.length > 1 && !sideFilter ? ` · ${SIDE_LABEL[g.side]}` : ""}
                          {g.callResult ? ` · ${CALL_LABEL[g.callResult]}` : ""}
                        </div>
                      </div>
                      <span className={`chip shrink-0 ${STATUS_TONE[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
