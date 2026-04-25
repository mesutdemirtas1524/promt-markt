import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchPlatforms, fetchUserFavoriteIds } from "@/lib/queries";
import { PromptCard } from "@/components/prompt-card";
import { getCurrentUser } from "@/lib/auth";
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

  const viewer = await getCurrentUser();
  const [prompts, categories, platforms, favoriteIds] = await Promise.all([
    fetchPromptCards({
      orderBy: sort,
      priceFilter: price,
      categorySlug: sp.category,
      search: search || undefined,
      limit: 48,
    }),
    fetchCategories(),
    fetchPlatforms(),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Explore prompts</h1>
        <ExploreSearchInput initialValue={search} preserve={sp} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>Newest</FilterPill>
        <FilterPill href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>Trending</FilterPill>
        <FilterPill href={buildHref(sp, { sort: "top" })} active={sort === "top"}>Top rated</FilterPill>
        <span className="mx-2 h-6 w-px bg-border" />
        <FilterPill href={buildHref(sp, { price: "all" })} active={price === "all"}>All</FilterPill>
        <FilterPill href={buildHref(sp, { price: "free" })} active={price === "free"}>Free</FilterPill>
        <FilterPill href={buildHref(sp, { price: "paid" })} active={price === "paid"}>Paid</FilterPill>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <FilterPill href={buildHref(sp, { category: undefined })} active={!sp.category} size="sm">
          All categories
        </FilterPill>
        {categories.map((c) => (
          <FilterPill
            key={c.id}
            href={buildHref(sp, { category: c.slug })}
            active={sp.category === c.slug}
            size="sm"
          >
            {c.name}
          </FilterPill>
        ))}
      </div>

      {search && (
        <p className="mb-4 text-sm text-muted-foreground">
          {prompts.length} result{prompts.length === 1 ? "" : "s"} for &ldquo;{search}&rdquo; ·{" "}
          <Link href={buildHref(sp, { q: undefined })} className="underline hover:text-foreground">
            clear search
          </Link>
        </p>
      )}

      {prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {search ? `No prompts match "${search}".` : "No prompts match these filters."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </div>
      )}

      <div className="mt-12 text-xs text-muted-foreground">
        Supported platforms: {platforms.map((p) => p.name).join(" · ")}
      </div>
    </div>
  );
}

function FilterPill({
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
          : "border-border bg-card text-foreground hover:bg-accent ") +
        (size === "sm"
          ? "inline-flex h-7 items-center rounded-full border px-3 text-xs transition-colors "
          : "inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors ")
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
