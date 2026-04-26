import Link from "next/link";
import {
  fetchPromptCards,
  fetchCategories,
  fetchPlatforms,
  fetchPublicStats,
} from "@/lib/queries";
import { getServerT } from "@/lib/i18n/server";
import { InfiniteFeed } from "@/components/infinite-feed";
import { PriceTag } from "@/components/price-tag";
import { ArrowRight, Sparkles, Trophy, Layers } from "lucide-react";
import { DiscoverSearch } from "@/components/discover/discover-search";
import {
  DiscoverFilters,
  type DiscoverSearchParams,
} from "@/components/discover/discover-filters";
import { DiscoverMobileFilters } from "@/components/discover/discover-mobile-filters";
import { DiscoverActiveFilters } from "@/components/discover/discover-active-filters";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  const sp = await searchParams;
  const sort = (sp.sort === "trending" || sp.sort === "top" ? sp.sort : "newest") as
    | "newest"
    | "trending"
    | "top";
  const price = (sp.price === "free" || sp.price === "paid" ? sp.price : "all") as
    | "all"
    | "free"
    | "paid";
  const search = sp.q?.trim() ?? "";
  const priceMin = sp.min ? parseFloat(sp.min) : undefined;
  const priceMax = sp.max ? parseFloat(sp.max) : undefined;

  const { t } = await getServerT();
  const PAGE_SIZE = 24;
  const [prompts, categories, platforms, stats] = await Promise.all([
    fetchPromptCards({
      orderBy: sort,
      priceFilter: price,
      priceMin,
      priceMax,
      categorySlug: sp.category,
      platformSlug: sp.platform,
      search: search || undefined,
      limit: PAGE_SIZE,
    }),
    fetchCategories(),
    fetchPlatforms(),
    fetchPublicStats(),
  ]);

  const showStats =
    stats.activePrompts > 0 ||
    stats.activeCreators > 0 ||
    stats.recentSales > 0 ||
    stats.recentVolumeSol > 0;

  const activeFilterCount =
    (sp.q ? 1 : 0) +
    (sp.category ? 1 : 0) +
    (sp.platform ? 1 : 0) +
    (sp.price && sp.price !== "all" ? 1 : 0) +
    ((sp.min && parseFloat(sp.min) > 0) || (sp.max && parseFloat(sp.max) > 0) ? 1 : 0);

  return (
    <div className="w-full">
      {/* Hero strip: title + big search + stats */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 20% 0%, var(--ambient-a), transparent 60%), radial-gradient(ellipse 50% 60% at 95% 100%, var(--ambient-b), transparent 60%)",
          }}
        />
        <div className="relative w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-16 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-tint-1 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span className="tracking-tight">{t("home.badge")}</span>
            </div>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              {t("home.title.1")}{" "}
              <span className="text-gradient-violet">{t("home.title.2")}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t("home.subtitle")}
            </p>
            <div className="mx-auto mt-6 max-w-2xl">
              <DiscoverSearch
                initialValue={search}
                preserve={sp as Record<string, string | undefined>}
                placeholder="Search prompts, styles, creators…"
              />
            </div>
          </div>

          {showStats && (
            <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Active prompts" value={stats.activePrompts.toLocaleString()} />
              <Stat label="Creators" value={stats.activeCreators.toLocaleString()} />
              <Stat label="Sales · 30d" value={stats.recentSales.toLocaleString()} />
              <Stat
                label="Volume · 30d"
                value={<PriceTag sol={stats.recentVolumeSol} size="base" />}
              />
            </dl>
          )}
        </div>
      </section>

      {/* Main: sidebar + feed */}
      <section className="w-full px-4 py-6 sm:px-6 lg:px-10 xl:px-16">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto rounded-xl border border-border bg-card p-4">
              <DiscoverFilters categories={categories} platforms={platforms} sp={sp} />
            </div>
          </aside>

          <div>
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DiscoverMobileFilters activeCount={activeFilterCount}>
                  <DiscoverFilters categories={categories} platforms={platforms} sp={sp} />
                </DiscoverMobileFilters>
                <span className="text-xs text-muted-foreground">
                  <span className="tabular-nums text-foreground">
                    {prompts.length}
                    {prompts.length === PAGE_SIZE ? "+" : ""}
                  </span>{" "}
                  {prompts.length === 1 ? t("explore.results.one") : t("explore.results.many")}
                </span>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <SortChip href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>
                  Newest
                </SortChip>
                <SortChip href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>
                  Trending
                </SortChip>
                <SortChip href={buildHref(sp, { sort: "top" })} active={sort === "top"}>
                  Top rated
                </SortChip>
              </div>
            </div>

            {/* Active filter pills */}
            {activeFilterCount > 0 && (
              <div className="mb-4">
                <DiscoverActiveFilters sp={sp} categories={categories} platforms={platforms} />
              </div>
            )}

            {prompts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
                {search ? `${t("explore.empty.search")} "${search}".` : t("explore.empty.filters")}
              </div>
            ) : (
              <InfiniteFeed
                initialItems={prompts}
                initialNextOffset={prompts.length}
                initialHasMore={prompts.length === PAGE_SIZE}
                filters={{
                  sort,
                  price,
                  priceMin,
                  priceMax,
                  category: sp.category,
                  platform: sp.platform,
                  q: search || undefined,
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Discovery + sell footer area */}
      <section className="w-full px-4 pb-16 sm:px-6 lg:px-10 xl:px-16">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/new"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-tint-1 p-5 transition-all hover:bg-tint-2"
          >
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-violet-300">
                <Sparkles className="h-2.5 w-2.5" />
                JUST DROPPED
              </div>
              <h3 className="text-base font-semibold tracking-tight">New arrivals</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                The freshest prompts on the marketplace.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
          <Link
            href="/creators"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-tint-1 p-5 transition-all hover:bg-tint-2"
          >
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wider text-amber-300">
                <Trophy className="h-2.5 w-2.5" />
                LAST 30 DAYS
              </div>
              <h3 className="text-base font-semibold tracking-tight">Top creators</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Whoever&apos;s shipping the prompts buyers actually want.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        </div>

        {categories.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3 w-3" />
              {t("home.browseByStyle")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-border bg-tint-1 px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-tint-2 hover:text-foreground"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-2xl border border-border bg-tint-1 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium tracking-tight">{t("home.sellTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.sellSubtitle")}</p>
            </div>
            <Link href="/upload">
              <span className="inline-flex h-9 items-center rounded-md border border-border bg-tint-2 px-4 text-sm font-medium tracking-tight transition-colors hover:bg-tint-3">
                {t("home.startSelling")}
              </span>
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center sm:text-left">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SortChip({
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
        (active
          ? "border-foreground bg-foreground text-background "
          : "border-border bg-tint-1 text-muted-foreground hover:bg-tint-2 hover:text-foreground ") +
        "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium tracking-tight transition-all"
      }
    >
      {children}
    </Link>
  );
}

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
