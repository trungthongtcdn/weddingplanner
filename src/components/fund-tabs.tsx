import Link from "next/link";
import { FUND_LABEL } from "@/lib/funds";

export function FundTabs({ funds, currentId, path }: { funds: { fund: { id: string; side: keyof typeof FUND_LABEL } }[]; currentId: string; path: string }) {
  if (funds.length < 2) return null;
  return (
    <div className="-mx-5 mb-4 overflow-x-auto px-5">
      <div className="flex min-w-max gap-2">
        {funds.map(({ fund }) => (
          <Link
            key={fund.id}
            href={`${path}?quy=${fund.id}`}
            aria-current={fund.id === currentId ? "page" : undefined}
            className={`chip min-h-10 border px-3.5 ${fund.id === currentId ? "border-son bg-son text-white" : "border-line bg-surface"}`}
          >
            {FUND_LABEL[fund.side]}
          </Link>
        ))}
      </div>
    </div>
  );
}
