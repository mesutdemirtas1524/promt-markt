import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchPlatforms, fetchUserFavoriteIds } from "@/lib/queries";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { ExploreSearchInput } from "./search-input";

export const dynamic = "force-dynamic";

type SearchParams = {
  sort?: "newest" | "top" | "trending";
  price?: "free" | "paid" | "all";
  category?: string;
  q?: string;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "newest";
  const price = sp.price ?? "all";
  const search = sp.q?.trim() ?? "";

  const { t } = await getServerT();
  const viewer = await getCurrentUser();
  const [prompts, categories, platforms, favoriteIds] = await Promise.all([
    fetchPromptCards({
      orderBy: sort,
      priceFilter: price,
      categorySlug: sp.category,
      search: search || undefined,
      limit: 96,
    }),
    fetchCategories(),
    fetchPlatforms(),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("explore.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("explore.subtitle")}</p>
        </div>
        <ExploreSearchInput initialValue={search} preserve={sp} placeholder={t("explore.search")} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>{t("filter.newest")}</Chip>
        <Chip href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>{t("filter.trending")}</Chip>
        <Chip href={buildHref(sp, { sort: "top" })} active={sort === "top"}>{t("filter.topRated")}</Chip>
        <span className="mx-2 my-auto h-5 w-px bg-border" />
        <Chip href={buildHref(sp, { price: "all" })} active={price === "all"}>{t("filter.all")}</Chip>
        <Chip href={buildHref(sp, { price: "free" })} active={price === "free"}>{t("filter.free")}</Chip>
        <Chip href={buildHref(sp, { price: "paid" })} active={price === "paid"}>{t("filter.paid")}</Chip>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <Chip href={buildHref(sp, { category: undefined })} active={!sp.category} size="sm">
          {t("filter.allCategories")}
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            href={buildHref(sp, { category: c.slug })}
            active={sp.category === c.slug}
            size="sm"
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {search && (
        <p className="mb-5 text-xs text-muted-foreground">
          {prompts.length}{" "}
          {prompts.length === 1 ? t("explore.results.one") : t("explore.results.many")}{" "}
          · <span className="text-foreground">&ldquo;{search}&rdquo;</span> ·{" "}
          <Link href={buildHref(sp, { q: undefined })} className="hover:text-foreground hover:underline underline-offset-2">
            {t("explore.clearSearch")}
          </Link>
        </p>
      )}

      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {search ? `${t("explore.empty.search")} "${search}".` : t("explore.empty.filters")}
        </div>
      ) : (
        <PromptMasonry>
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </PromptMasonry>
      )}

      <div className="mt-12 text-[11px] uppercase tracking-wider text-muted-foreground/70">
        {t("explore.supported")} · {platforms.map((p) => p.name).join(" · ")}
      </div>
    </div>
  );
}

function Chip({
  href,
  active,
  size = "default",
  children,
}: {
  href: string;
  active: boolean;
  size?: "sm" | "default";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        (active
          ? "border-foreground bg-foreground text-background "
          : "border-border bg-tint-1 text-muted-foreground hover:bg-tint-2 hover:text-foreground ") +
        (size === "sm"
          ? "inline-flex h-7 items-center rounded-full border px-3 text-[11px] tracking-tight transition-all "
          : "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium tracking-tight transition-all ")
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
  return qs ? `/explore?${qs}` : "/explore";
}
