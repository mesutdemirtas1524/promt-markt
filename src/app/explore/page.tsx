import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchPlatforms } from "@/lib/queries";
import { PromptCard } from "@/components/prompt-card";

export const dynamic = "force-dynamic";

type SearchParams = {
  sort?: "newest" | "top" | "trending";
  price?: "free" | "paid" | "all";
  category?: string;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "newest";
  const price = sp.price ?? "all";

  const [prompts, categories, platforms] = await Promise.all([
    fetchPromptCards({ orderBy: sort, priceFilter: price, categorySlug: sp.category, limit: 48 }),
    fetchCategories(),
    fetchPlatforms(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">Explore prompts</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill href="/explore?sort=newest" active={sort === "newest"}>Newest</FilterPill>
        <FilterPill href="/explore?sort=trending" active={sort === "trending"}>Trending</FilterPill>
        <FilterPill href="/explore?sort=top" active={sort === "top"}>Top rated</FilterPill>
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

      {prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No prompts match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
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
