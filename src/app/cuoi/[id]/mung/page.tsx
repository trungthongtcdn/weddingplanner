import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getWeddingAccess, canSeeGuests, parentJoinedMap } from "@/lib/access";
import { resolveFunds, FUND_LABEL } from "@/lib/funds";
import { PageTitle, Empty, Notice, SectionTitle, Stat } from "@/components/ui";
import { FundTabs } from "@/components/fund-tabs";
import { formatVnd, formatVndShort } from "@/lib/vn-money";
import { bankName } from "@/lib/vietqr";
import { GiftRow } from "./gift-row";

export const metadata: Metadata = { title: "Sổ mừng" };

const METHOD_LABEL = { CHUYEN_KHOAN: "Chuyển khoản", PHONG_BI: "Phong bì", HIEN_VAT: "Hiện vật" } as const;

export default async function LedgerPage({ params, searchParams }: PageProps<"/cuoi/[id]/mung">) {
  const { id } = await params;
  const sp = await searchParams;
  const access = await getWeddingAccess(id);
  if (!canSeeGuests(access.member.role)) notFound();
  const { funds, current } = await resolveFunds(access, sp.quy);

  if (!current) {
    const joined = await parentJoinedMap(id);
    return (
      <>
        <PageTitle title="Sổ mừng" />
        <Empty title="Chưa có quỹ nào bạn được xem">
          {joined.NHA_TRAI || joined.NHA_GAI
            ? "Quỹ mừng nhà trai, nhà gái do bố mẹ mỗi bên quản lý. Bố mẹ có thể bật quyền cho cặp đôi xem."
            : "Hỏi cô dâu chú rể về quyền xem quỹ."}
        </Empty>
      </>
    );
  }

  const { fund, perm } = current;
  const gifts = await db
    .select({ gift: schema.gifts, guestName: schema.guests.name, honorific: schema.guests.honorific })
    .from(schema.gifts)
    .leftJoin(schema.guests, eq(schema.gifts.guestId, schema.guests.id))
    .where(eq(schema.gifts.fundId, fund.id))
    .orderBy(desc(schema.gifts.createdAt));
  const total = gifts.reduce((s, g) => s + g.gift.amount, 0);
  const unmatched = gifts.filter((g) => g.gift.matchStatus === "UNMATCHED").length;
  const items = gifts.filter((g) => g.gift.itemDesc).length;
  const base = `/cuoi/${id}/mung`;
  const q = `?quy=${fund.id}`;
  const isParentOwner =
    (fund.side === "NHA_TRAI" && access.member.role === "PARENT_GROOM") || (fund.side === "NHA_GAI" && access.member.role === "PARENT_BRIDE");

  return (
    <>
      <PageTitle title="Sổ mừng" sub="Tiền vào thẳng tài khoản của chủ quỹ. Sổ chỉ ghi nhận và đối soát." />
      <FundTabs funds={funds} currentId={fund.id} path={base} />

      <div className="panel grid grid-cols-[1.6fr_1fr_1fr] gap-2 px-4 py-4">
        <Stat value={formatVndShort(total)} label={FUND_LABEL[fund.side]} />
        <Stat value={gifts.length} label="Khoản" />
        <Stat value={items} label="Hiện vật" />
      </div>

      {access.member.role === "COUPLE" && fund.side !== "CAP_DOI" && !perm.manage ? (
        <p className="mt-2 text-[0.85rem] text-muted">Bố mẹ đang cho bạn xem quỹ này; chỉ bố mẹ được sửa.</p>
      ) : null}
      {access.member.role === "COUPLE" && fund.side !== "CAP_DOI" && perm.manage ? (
        <p className="mt-2 text-[0.85rem] text-muted">Bạn đang tạm quản lý quỹ này vì bố mẹ {fund.side === "NHA_TRAI" ? "nhà trai" : "nhà gái"} chưa tham gia.</p>
      ) : null}

      {perm.manage ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`${base}/phong-bi${q}`} className="btn-primary">
            Bóc phong bì
          </Link>
          <Link href={`${base}/sao-ke${q}`} className="btn-quiet">
            Nhập sao kê
          </Link>
          <Link href={`${base}/cho${q}`} className={`btn-quiet ${unmatched ? "border-amber/50 text-amber" : ""}`}>
            Ai đây?{unmatched ? ` (${unmatched})` : ""}
          </Link>
          <Link href={`${base}/cam-on${q}`} className="btn-quiet">
            Cảm ơn khách
          </Link>
        </div>
      ) : null}

      {perm.manage ? (
        <Link href={`${base}/quy${q}`} className="mt-3 block">
          {fund.bankBin ? (
            <span className="block text-[0.88rem] text-muted">
              Nhận chuyển khoản: {bankName(fund.bankBin)} · {fund.accountNumber} <span className="font-medium text-son">Sửa</span>
            </span>
          ) : (
            <Notice tone="caution">Chưa có tài khoản nhận — thiệp sẽ không hiện mã QR mừng. Bấm để thêm.</Notice>
          )}
        </Link>
      ) : null}
      {isParentOwner ? (
        <Link href={`${base}/quy${q}`} className="mt-1 block text-[0.88rem] text-muted">
          Cặp đôi {fund.coupleCanView ? "đang được xem" : "không xem được"} số tiền quỹ này. <span className="font-medium text-son">Đổi</span>
        </Link>
      ) : null}

      <SectionTitle>Các khoản</SectionTitle>
      {gifts.length === 0 ? (
        <Empty title="Chưa ghi khoản nào">Sau tiệc, mở “Bóc phong bì” và đọc to từng phong bì. Chuyển khoản thì tải file sao kê lên để tự khớp.</Empty>
      ) : (
        <ul className="panel rows">
          {gifts.map(({ gift, guestName, honorific }) => (
            <GiftRow
              key={gift.id}
              weddingId={id}
              canEdit={perm.manage}
              gift={{
                id: gift.id,
                amount: gift.amount,
                itemDesc: gift.itemDesc,
                note: gift.note,
                rawText: gift.rawText,
                matchStatus: gift.matchStatus,
                methodLabel: METHOD_LABEL[gift.method],
                who: guestName ? `${honorific ? honorific + " " : ""}${guestName}` : null,
                amountText: gift.itemDesc ? gift.itemDesc + (gift.amount ? ` + ${formatVnd(gift.amount)}` : "") : formatVnd(gift.amount),
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
