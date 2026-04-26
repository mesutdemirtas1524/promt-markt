import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchPublicStats } from "@/lib/queries";
import { PriceTag } from "@/components/price-tag";
import { getServerT } from "@/lib/i18n/server";
import { InfiniteFeed } from "@/components/infinite-feed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";

// ISR — re-render every 60s. New uploads also trigger on-demand
// revalidation via revalidatePath('/') in /api/prompts/create.
export const revalidate = 60;

type SearchParams = {
  sort?: "newest" | "top" | "trending";
  price?: "free" | "paid" | "all";
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "newest";
  const price = sp.price ?? "all";

  const { t } = await getServerT();
  const PAGE_SIZE = 24;
  const [prompts, categories, stats] = await Promise.all([
    fetchPromptCards({ orderBy: sort, priceFilter: price, limit: PAGE_SIZE }),
    fetchCategories(),
    fetchPublicStats(),
  ]);
  const showStats =
    stats.activePrompts > 0 ||
    stats.activeCreators > 0 ||
    stats.recentSales > 0 ||
    stats.recentVolumeSol > 0;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
      <section className="relative mb-10 overflow-hidden rounded-2xl border border-border">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 25% 0%, var(--ambient-a), transparent 60%), radial-gradient(ellipse 50% 50% at 95% 100%, var(--ambient-b), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-start gap-5 p-8 md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-tint-1 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-violet-400" />
            <span className="tracking-tight">{t("home.badge")}</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            {t("home.title.1")}{" "}
            <span className="text-gradient-violet">{t("home.title.2")}</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">{t("home.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore">
              <Button size="lg" variant="primary" className="gap-2">
                {t("home.cta.browse")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {showStats && (
            <dl className="mt-6 grid w-full grid-cols-2 gap-x-8 gap-y-4 border-t border-border/60 pt-6 sm:grid-cols-4">
              <Stat
                label="Active prompts"
                value={stats.activePrompts.toLocaleString()}
              />
              <Stat
                label="Creators"
                value={stats.activeCreators.toLocaleString()}
              />
              <Stat
                label="Sales · 30d"
                value={stats.recentSales.toLocaleString()}
              />
              <Stat
                label="Volume · 30d"
                value={<PriceTag sol={stats.recentVolumeSol} size="base" />}
              />
            </dl>
          )}
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Chip href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>
          {t("filter.newest")}
        </Chip>
        <Chip href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>
          {t("filter.trending")}
        </Chip>
        <Chip href={buildHref(sp, { sort: "top" })} active={sort === "top"}>
          {t("filter.topRated")}
        </Chip>
        <span className="mx-2 my-auto h-5 w-px bg-border" />
        <Chip href={buildHref(sp, { price: "all" })} active={price === "all"}>
          {t("filter.all")}
        </Chip>
        <Chip href={buildHref(sp, { price: "free" })} active={price === "free"}>
          {t("filter.free")}
        </Chip>
        <Chip href={buildHref(sp, { price: "paid" })} active={price === "paid"}>
          {t("filter.paid")}
        </Chip>
        <Link
          href="/explore"
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("home.advancedFilters")} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {t("home.empty")}
        </div>
      ) : (
        <InfiniteFeed
          initialItems={prompts}
          initialNextOffset={prompts.length}
          initialHasMore={prompts.length === PAGE_SIZE}
          filters={{ sort, price }}
        />
      )}

      <section className="mt-16 grid gap-3 sm:grid-cols-2">
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
      </section>

      {categories.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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

      <section className="mt-16 rounded-2xl border border-border bg-tint-1 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium tracking-tight">{t("home.sellTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.sellSubtitle")}</p>
          </div>
          <Link href="/upload">
            <Button variant="outline" size="sm">
              {t("home.startSelling")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Chip({
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

function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  (Object.keys(merged) as (keyof SearchParams)[]).forEach((k) => {
    const v = merged[k];
    if (v) params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
