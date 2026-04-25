"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardTabs({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "relative whitespace-nowrap px-4 py-2.5 text-sm tracking-tight transition-colors " +
              (active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
