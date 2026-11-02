import Link from "next/link";
import { getWeddingAccess } from "@/lib/access";
import { BottomNav } from "@/components/bottom-nav";
import { countdownText, formatDateVn } from "@/lib/dates";

export default async function WeddingLayout({ children, params }: LayoutProps<"/cuoi/[id]">) {
  const { id } = await params;
  const { wedding, member } = await getWeddingAccess(id);
  return (
    <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-2.5">
          <Link href={`/cuoi/${id}`} className="min-w-0">
            <div className="truncate font-bold">
              {wedding.groomName} <span className="text-kim">&</span> {wedding.brideName}
            </div>
            <div className="text-[0.8rem] text-muted">
              {countdownText(wedding.weddingDate)} · {formatDateVn(wedding.weddingDate, false)}
            </div>
          </Link>
          <span className="shrink-0 rounded-full bg-son-tint px-2.5 py-1 text-[0.75rem] font-medium text-son">{member.displayName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 pt-5">{children}</main>
      <BottomNav weddingId={id} helper={member.role === "HELPER"} />
    </div>
  );
}
