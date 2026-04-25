import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchUserFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

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

  const viewer = await getCurrentUser();
  const [prompts, categories, favoriteIds] = await Promise.all([
    fetchPromptCards({ orderBy: sort, priceFilter: price, limit: 60 }),
    fetchCategories(),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      {/* Hero — buyer-focused, compact */}
      <section className="relative mb-10 overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 25% 0%, rgba(167, 139, 250, 0.20), transparent 60%), radial-gradient(ellipse 50% 50% at 95% 100%, rgba(244, 114, 182, 0.10), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-start gap-5 p-8 md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-violet-300" />
            <span className="tracking-tight">Curated AI image prompts · Pay-per-prompt in SOL</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Find the prompt behind the image{" "}
            <span className="text-gradient-violet">you love.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Browse images, tap any one to unlock the exact prompt that produced it. No
            subscriptions — pay only for what you want.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore">
              <Button size="lg" variant="primary" className="gap-2">
                Browse prompts <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Chip href={buildHref(sp, { sort: "newest" })} active={sort === "newest"}>
          Newest
        </Chip>
        <Chip href={buildHref(sp, { sort: "trending" })} active={sort === "trending"}>
          Trending
        </Chip>
        <Chip href={buildHref(sp, { sort: "top" })} active={sort === "top"}>
          Top rated
        </Chip>
        <span className="mx-2 my-auto h-5 w-px bg-white/[0.08]" />
        <Chip href={buildHref(sp, { price: "all" })} active={price === "all"}>
          All
        </Chip>
        <Chip href={buildHref(sp, { price: "free" })} active={price === "free"}>
          Free
        </Chip>
        <Chip href={buildHref(sp, { price: "paid" })} active={price === "paid"}>
          Paid
        </Chip>
        <Link
          href="/explore"
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Advanced filters <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Masonry feed */}
      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-16 text-center text-sm text-muted-foreground">
          No prompts yet — check back soon.
        </div>
      ) : (
        <PromptMasonry>
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </PromptMasonry>
      )}

      {/* Categories — secondary discovery */}
      {categories.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Browse by style
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted-foreground transition-all hover:border-white/15 hover:bg-white/[0.05] hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Subtle creator CTA at the bottom — for the small fraction who'd sell */}
      <section className="mt-16 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium tracking-tight">Sell your own prompts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              80% to creators · 20% platform · paid instantly on-chain
            </p>
          </div>
          <Link href="/upload">
            <Button variant="outline" size="sm">
              Start selling
            </Button>
          </Link>
        </div>
      </section>
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
          ? "border-white/[0.18] bg-white text-background "
          : "border-white/[0.07] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:bg-white/[0.05] hover:text-foreground ") +
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
