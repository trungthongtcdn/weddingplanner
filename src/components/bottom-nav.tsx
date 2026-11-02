"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

const ICONS = {
  home: "M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z",
  rite: "M6 4h12v4H6zM8 8v12M16 8v12M5 20h14M10 12h4",
  guests: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c2 .6 3 2.3 3 5",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-3-6-3-6-1s4 1 6 1zm0 0c2-3 6-3 6-1s-4 1-6 1z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export function BottomNav({ weddingId, helper }: { weddingId: string; helper: boolean }) {
  const pathname = usePathname();
  const base = `/cuoi/${weddingId}`;
  const items: Item[] = helper
    ? [
        { href: base, label: "Tổng quan", icon: "home", exact: true },
        { href: `${base}/le`, label: "Lễ", icon: "rite" },
        { href: `${base}/viec`, label: "Việc", icon: "tasks" },
      ]
    : [
        { href: base, label: "Tổng quan", icon: "home", exact: true },
        { href: `${base}/le`, label: "Lễ", icon: "rite" },
        { href: `${base}/khach`, label: "Khách", icon: "guests" },
        { href: `${base}/mung`, label: "Sổ mừng", icon: "gift" },
        { href: `${base}/them`, label: "Thêm", icon: "more" },
      ];
  const moreRoutes = ["/viec", "/ngan-sach", "/tiec", "/thanh-vien", "/them", "/thong-tin"];
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : it.icon === "more"
              ? moreRoutes.some((r) => pathname.startsWith(base + r))
              : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-medium ${active ? "text-son" : "text-muted"}`}
              >
                <svg aria-hidden width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d={ICONS[it.icon]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={it.icon === "more" ? 3.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
