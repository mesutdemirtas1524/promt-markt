import Link from "next/link";
import type { Category, Platform } from "@/lib/supabase/types";
import { DiscoverPriceRange } from "./discover-price-range";
import { DiscoverSection } from "./discover-section";
import { Check } from "lucide-react";

export type DiscoverSearchParams = {
  sort?: string;
  price?: string;
  category?: string;
  platform?: string;
  q?: string;
  min?: string;
  max?: string;
};

function buildHref(current: DiscoverSearchParams, patch: Partial<DiscoverSearchParams>): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  (Object.keys(merged) as (keyof DiscoverSearchParams)[]).forEach((k) => {
    const v = merged[k];
    if (v) params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * The desktop filter rail. Renders as plain server-side links so the
 * URL stays the source of truth. The mobile drawer wraps the same
 * markup with a sheet so we don't fork the filter logic.
 */
export function DiscoverFilters({
  categories,
  platforms,
  sp,
}: {
  categories: Category[];
  platforms: Platform[];
  sp: DiscoverSearchParams;
}) {
  const sort = sp.sort ?? "newest";
  const price = sp.price ?? "all";

  return (
    <div className="space-y-5">
      <DiscoverSection title="Sort" defaultOpen collapsible={false}>
        <RadioRow href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>Newest</RadioRow>
        <RadioRow href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>Trending</RadioRow>
        <RadioRow href={buildHref(sp, { sort: "top" })} active={sort === "top"}>Top rated</RadioRow>
      </DiscoverSection>

      <DiscoverSection title="Price" defaultOpen collapsible={false}>
        <RadioRow href={buildHref(sp, { price: "all" })} active={price === "all"}>All</RadioRow>
        <RadioRow href={buildHref(sp, { price: "free" })} active={price === "free"}>Free only</RadioRow>
        <RadioRow href={buildHref(sp, { price: "paid" })} active={price === "paid"}>Paid only</RadioRow>
        <div className="pt-2">
          <DiscoverPriceRange initialMin={sp.min} initialMax={sp.max} preserve={sp} />
        </div>
      </DiscoverSection>

      <DiscoverSection title="Category" defaultOpen={Boolean(sp.category)} badge={sp.category ? 1 : 0}>
        <RadioRow href={buildHref(sp, { category: undefined })} active={!sp.category}>
          All categories
        </RadioRow>
        {categories.map((c) => (
          <RadioRow
            key={c.id}
            href={buildHref(sp, { category: c.slug })}
            active={sp.category === c.slug}
          >
            {c.name}
          </RadioRow>
        ))}
      </DiscoverSection>

      <DiscoverSection title="Platform" defaultOpen={Boolean(sp.platform)} badge={sp.platform ? 1 : 0}>
        <RadioRow href={buildHref(sp, { platform: undefined })} active={!sp.platform}>
          All platforms
        </RadioRow>
        {platforms.map((p) => (
          <RadioRow
            key={p.id}
            href={buildHref(sp, { platform: p.slug })}
            active={sp.platform === p.slug}
          >
            {p.name}
          </RadioRow>
        ))}
      </DiscoverSection>
    </div>
  );
}

function RadioRow({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors " +
        (active
          ? "bg-tint-2 text-foreground"
          : "text-muted-foreground hover:bg-tint-1 hover:text-foreground")
      }
    >
      <span className="truncate">{children}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-violet-300" />}
    </Link>
  );
}
