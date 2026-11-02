import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess } from "@/lib/access";
import {
  CEREMONIES_GUIDE,
  CEREMONY_LABEL,
  REGION_LABEL,
  RITUAL_CONTENT_STATUS,
  differencesBetween,
} from "@/lib/rituals";
import { CEREMONIES, type Ceremony, type Region } from "@/lib/db/schema";
import { Notice, PageTitle, SectionTitle } from "@/components/ui";
import { DecisionForm } from "./decision-form";

export const metadata: Metadata = { title: "Kế hoạch lễ" };

/** Mục khác biệt quyết định phong tục áp dụng cho từng lễ. */
const GOVERNING_DIFF: Partial<Record<Ceremony, string>> = { AN_HOI: "le-vat-an-hoi", LE_CUOI: "truoc-ruoc-dau" };

export default async function RitesPage({ params, searchParams }: PageProps<"/cuoi/[id]/le">) {
  const { id } = await params;
  const sp = await searchParams;
  const { wedding, member } = await getWeddingAccess(id);
  const active = (CEREMONIES as readonly string[]).includes(String(sp.le)) ? (sp.le as Ceremony) : "AN_HOI";
  const guide = CEREMONIES_GUIDE.find((g) => g.key === active)!;
  const decisions = await db.select().from(schema.decisions).where(eq(schema.decisions.weddingId, id));
  const diffs = differencesBetween(wedding.groomRegion, wedding.brideRegion);
  const sameRegion = wedding.groomRegion === wedding.brideRegion;

  // Phong tục áp dụng cho lễ đang xem
  const hostRegion: Region = guide.host === "NHA_GAI" ? wedding.brideRegion : wedding.groomRegion;
  const gov = GOVERNING_DIFF[active];
  const govDecision = gov ? decisions.find((d) => d.key === gov) : undefined;
  let region: Region = hostRegion;
  let regionNote = sameRegion
    ? `Theo phong tục ${REGION_LABEL[region].toLowerCase()} của hai nhà.`
    : `Đang hiển thị theo phong tục nơi tổ chức lễ (${guide.host === "NHA_GAI" ? "nhà gái" : "nhà trai"}, ${REGION_LABEL[hostRegion].toLowerCase()}). Hai nhà chưa chốt.`;
  if (!sameRegion && govDecision) {
    if (govDecision.choice === "GROOM") region = wedding.groomRegion;
    if (govDecision.choice === "BRIDE") region = wedding.brideRegion;
    regionNote =
      govDecision.choice === "CUSTOM"
        ? `Hai nhà thống nhất cách riêng: ${govDecision.note}`
        : `Theo phong tục ${govDecision.choice === "GROOM" ? "nhà trai" : "nhà gái"} (${REGION_LABEL[region].toLowerCase()})${govDecision.confirmed ? ", đã chốt." : ", chưa chốt."}`;
  }
  const readOnly = member.role === "HELPER";

  return (
    <>
      <PageTitle title="Kế hoạch lễ" sub={`Nhà trai ${REGION_LABEL[wedding.groomRegion].toLowerCase()} · nhà gái ${REGION_LABEL[wedding.brideRegion].toLowerCase()}`} />

      <nav aria-label="Các lễ" className="-mx-5 mb-5 overflow-x-auto px-5">
        <ol className="flex min-w-max gap-2">
          {CEREMONIES.map((c, i) => (
            <li key={c}>
              <Link
                href={`?le=${c}`}
                scroll={false}
                aria-current={c === active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.95rem] font-medium ${
                  c === active ? "border-son bg-son text-white" : "border-line bg-surface text-ink"
                }`}
              >
                <span className={`text-[0.8rem] ${c === active ? "text-white/80" : "text-muted"}`}>{i + 1}</span>
                {CEREMONY_LABEL[c]}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {RITUAL_CONTENT_STATUS === "draft" ? (
        <Notice>Nội dung mẫu, đang chờ chuyên gia phong tục duyệt. Mỗi gia đình, mỗi địa phương có thể làm khác — hãy hỏi thêm người lớn trong họ.</Notice>
      ) : null}

      <article className="mt-5">
        <h2 className="text-[1.35rem] font-bold">{CEREMONY_LABEL[active]}</h2>
        <p className="mt-1.5">{guide.meaning}</p>
        <dl className="mt-4 space-y-3 text-[0.95rem]">
          <div>
            <dt className="font-semibold">Thời điểm</dt>
            <dd className="text-muted">{guide.when}</dd>
          </div>
          <div>
            <dt className="font-semibold">Thành phần</dt>
            <dd className="text-muted">{guide.participants}</dd>
          </div>
        </dl>

        <p className="mt-4 border-l-2 border-kim pl-3 text-[0.9rem] text-muted">{regionNote}</p>

        <SectionTitle>Lễ vật</SectionTitle>
        <ul className="panel rows">
          {guide.offerings[region].map((o) => (
            <li key={o} className="px-4 py-2.5">
              {o}
            </li>
          ))}
        </ul>
        {guide.offeringNote?.[region] ? <p className="mt-2 text-[0.9rem] text-muted">{guide.offeringNote[region]}</p> : null}

        <SectionTitle>Trình tự</SectionTitle>
        <ol className="space-y-3">
          {guide.steps[region].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-son-tint text-[0.85rem] font-semibold text-son">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href={`/cuoi/${id}/le/phat-bieu?le=${active}&ben=NHA_TRAI`} className="btn-quiet btn-sm">
            Phát biểu nhà trai
          </Link>
          <Link href={`/cuoi/${id}/le/phat-bieu?le=${active}&ben=NHA_GAI`} className="btn-quiet btn-sm">
            Phát biểu nhà gái
          </Link>
        </div>
      </article>

      {diffs.length ? (
        <section id="khac-biet" className="scroll-mt-20">
          <SectionTitle>Chỗ phong tục hai nhà khác nhau</SectionTitle>
          <p className="mb-3 text-[0.92rem] text-muted">
            Một cách nhiều gia đình chọn: lễ tổ chức ở nhà bên nào thì theo tục bên đó. Quyết định cuối cùng là của hai gia đình.
          </p>
          <div className="space-y-3">
            {diffs.map((d) => {
              const dec = decisions.find((x) => x.key === d.key);
              return (
                <div key={d.key} className="panel px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{d.title}</div>
                      <div className="text-[0.85rem] text-muted">{CEREMONY_LABEL[d.ceremony]}</div>
                    </div>
                    <span className={`chip shrink-0 ${dec?.confirmed ? "bg-moss-tint text-moss" : "bg-amber-tint text-amber"}`}>
                      {dec?.confirmed ? "Đã chốt" : "Chưa chốt"}
                    </span>
                  </div>
                  <DecisionForm
                    weddingId={id}
                    diffKey={d.key}
                    groomText={`Nhà trai (${REGION_LABEL[wedding.groomRegion]}): ${d.byRegion[wedding.groomRegion]}`}
                    brideText={`Nhà gái (${REGION_LABEL[wedding.brideRegion]}): ${d.byRegion[wedding.brideRegion]}`}
                    initial={dec ? { choice: dec.choice, note: dec.note ?? "", confirmed: dec.confirmed } : null}
                    readOnly={readOnly}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
