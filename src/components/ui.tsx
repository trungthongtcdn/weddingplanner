import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] leading-tight font-bold tracking-[-0.01em]">{title}</h1>
        {sub ? <div className="mt-1 text-muted">{sub}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[1.1rem] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "caution" | "good"; children: ReactNode }) {
  const cls =
    tone === "caution"
      ? "border-amber/30 bg-amber-tint text-[#5c3a07]"
      : tone === "good"
        ? "border-moss/25 bg-moss-tint text-[#1f3d2b]"
        : "border-kim/30 bg-kim-tint text-[#4a3610]";
  return <div className={`rounded-xl border px-3.5 py-3 text-[0.92rem] ${cls}`}>{children}</div>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel px-5 py-7 text-center">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-[34ch] text-[0.92rem] text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function RowLink({ href, children, trailing }: { href: string; children: ReactNode; trailing?: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper/60">
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ?? <Chevron />}
    </Link>
  );
}

export function Chevron() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className="shrink-0 text-muted">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex min-h-10 items-center gap-1 text-[0.95rem] font-medium text-son">
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="text-[1.45rem] leading-tight font-bold tabular-nums">{value}</div>
      <div className="text-[0.85rem] text-muted">{label}</div>
    </div>
  );
}
