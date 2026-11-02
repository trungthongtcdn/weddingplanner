import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import "@fontsource/playfair-display/600-italic.css";
import { loadInvite } from "@/lib/public-invite";
import { formatDateVn } from "@/lib/dates";
import { formatLunar, lunarFromIso } from "@/lib/lunar";
import { buildVietQrPayload, giftTransferNote, bankName } from "@/lib/vietqr";
import { guestAddress } from "@/lib/invite";
import { InviteInteractions, GiftSection } from "./interactions";

export async function generateMetadata({ params }: PageProps<"/t/[token]">): Promise<Metadata> {
  const { token } = await params;
  const inv = await loadInvite(token);
  if (!inv) return { title: "Thiệp cưới" };
  return {
    title: `Thiệp cưới ${inv.wedding.groomName} & ${inv.wedding.brideName}`,
    description: `Trân trọng kính mời đến dự lễ thành hôn, ${formatDateVn(inv.wedding.weddingDate)}.`,
    robots: { index: false, follow: false },
  };
}

const display = { fontFamily: '"Playfair Display", Georgia, serif', fontStyle: "italic", fontWeight: 600 } as const;

export default async function InvitationPage({ params, searchParams }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await loadInvite(token);
  if (!inv) notFound();
  const { guest, wedding, parties, fund } = inv;
  const preview = sp["xem-truoc"] === "1";

  let qr: { dataUrl: string; bank: string; account: string; holder: string; note: string } | null = null;
  if (wedding.giftQrEnabled && fund?.bankBin && fund.accountNumber) {
    const note = giftTransferNote(guest.giftCode, "chuc mung");
    const payload = buildVietQrPayload({ bin: fund.bankBin, accountNumber: fund.accountNumber, note });
    qr = {
      dataUrl: await QRCode.toDataURL(payload, { margin: 1, width: 560, errorCorrectionLevel: "M" }),
      bank: bankName(fund.bankBin),
      account: fund.accountNumber,
      holder: fund.accountName ?? "",
      note,
    };
  }

  return (
    <main className="min-h-dvh bg-paper">
      <section className="relative overflow-hidden bg-son px-5 pt-[max(2.25rem,env(safe-area-inset-top))] pb-12 text-[#fbf3e4]">
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[18px] border border-kim/70" />
        <div aria-hidden className="pointer-events-none absolute inset-[18px] rounded-[14px] border border-kim/35" />
        <div className="relative mx-auto max-w-md text-center">
          <p className="pt-6 text-[0.95rem] tracking-wide text-[#f1dcb2]">Trân trọng kính mời</p>
          <p className="mt-2 text-[1.7rem] leading-tight font-semibold">{guestAddress(guest)}</p>
          <p className="mx-auto mt-3 max-w-[30ch] text-[0.98rem] text-[#f5e6cc]">đến dự lễ thành hôn của</p>
          <h1 className="mt-5 leading-[1.05]" style={display}>
            <span className="block text-[2.9rem]">{wedding.groomName}</span>
            <span className="my-1 block text-[1.6rem] text-kim">và</span>
            <span className="block text-[2.9rem]">{wedding.brideName}</span>
          </h1>
          <div aria-hidden className="mx-auto mt-6 flex items-center justify-center gap-3 text-kim">
            <span className="h-px w-12 bg-kim/70" />
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="currentColor" />
            </svg>
            <span className="h-px w-12 bg-kim/70" />
          </div>
          <p className="mt-4 text-[1.05rem] font-medium">{formatDateVn(wedding.weddingDate)}</p>
          <p className="text-[0.92rem] text-[#f1dcb2]">Âm lịch {formatLunar(lunarFromIso(wedding.weddingDate))}</p>
        </div>
      </section>

      <div className="mx-auto max-w-md px-5 pt-7 pb-14">
        <h2 className="mb-3 text-[1.15rem] font-semibold">{parties.length > 1 ? "Các buổi tiệc" : "Buổi tiệc"}</h2>
        <ol className="space-y-3">
          {parties.map((p) => {
            const lunar = lunarFromIso(p.startsAt.slice(0, 10));
            const mapUrl = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : null;
            return (
              <li key={p.id} className="panel px-4 py-4">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 text-[1.35rem] leading-tight font-bold tabular-nums">{p.startsAt.slice(11, 16)}</div>
                <div className="text-[0.95rem]">{formatDateVn(p.startsAt.slice(0, 10))}</div>
                <div className="text-[0.85rem] text-muted">Âm lịch {lunar.day}/{lunar.month}{lunar.leap ? " nhuận" : ""}</div>
                {p.venue || p.address ? (
                  <div className="mt-3 border-t border-line pt-3 text-[0.95rem]">
                    {p.venue ? <div className="font-medium">{p.venue}</div> : null}
                    {p.address ? <div className="text-muted">{p.address}</div> : null}
                    {mapUrl ? (
                      <a href={mapUrl} target="_blank" rel="noopener" className="btn-quiet btn-sm mt-3 w-full">
                        Chỉ đường
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <InviteInteractions token={token} preview={preview} remindOptIn={guest.remindOptIn} />

        {qr ? <GiftSection qr={qr} eventName={`Cưới ${wedding.groomName} & ${wedding.brideName}`} eventDate={wedding.weddingDate} /> : null}

        <p className="mt-12 text-center text-[0.8rem] text-muted">Thiệp mời gửi riêng cho {guestAddress(guest)} · Trăm Năm</p>
      </div>
    </main>
  );
}
