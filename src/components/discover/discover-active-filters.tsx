import Link from "next/link";
import { X } from "lucide-react";
import type { Category, Platform } from "@/lib/supabase/types";
import type { DiscoverSearchParams } from "./discover-filters";

/**
 * Pills above the feed showing each active filter. Clicking the X
 * removes that one filter. "Clear all" wipes everything.
 */
export function DiscoverActiveFilters({
  sp,
  categories,
  platforms,
}: {
  sp: DiscoverSearchParams;
  categories: Category[];
  platforms: Platform[];
}) {
  const cat = sp.category ? categories.find((c) => c.slug === sp.category) : null;
  const plat = sp.platform ? platforms.find((p) => p.slug === sp.platform) : null;
  const hasPriceRange = (sp.min && parseFloat(sp.min) > 0) || (sp.max && parseFloat(sp.max) > 0);

  const chips: { label: string; href: string }[] = [];
  if (sp.q) chips.push({ label: `"${sp.q}"`, href: hrefWithout(sp, "q") });
  if (cat) chips.push({ label: cat.name, href: hrefWithout(sp, "category") });
  if (plat) chips.push({ label: plat.name, href: hrefWithout(sp, "platform") });
  if (sp.price && sp.price !== "all") chips.push({ label: sp.price === "free" ? "Free" : "Paid", href: hrefWithout(sp, "price") });
  if (hasPriceRange) {
    const range = `${sp.min || "0"}–${sp.max || "∞"} SOL`;
    chips.push({ label: range, href: hrefWithout(sp, "min", "max") });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => (
        <Link
          key={i}
          href={c.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 transition-colors hover:bg-violet-500/15"
        >
          {c.label}
          <X className="h-3 w-3 opacity-70" />
        </Link>
      ))}
      <Link
        href="/"
        className="ml-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
      >
        Clear all
      </Link>
    </div>
  );
}

function hrefWithout(sp: DiscoverSearchParams, ...keys: (keyof DiscoverSearchParams)[]): string {
  const remaining = { ...sp };
  for (const k of keys) delete remaining[k];
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(remaining)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
