import Link from "next/link";
import { fetchPromptCards, fetchCategories, fetchUserFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PromptCard } from "@/components/prompt-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Coins, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const [newest, trending, topRated, categories, favoriteIds] = await Promise.all([
    fetchPromptCards({ orderBy: "newest", limit: 8 }),
    fetchPromptCards({ orderBy: "trending", limit: 4 }),
    fetchPromptCards({ orderBy: "top", limit: 4 }),
    fetchCategories(),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  const isEmpty = newest.length === 0 && trending.length === 0 && topRated.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <section className="mb-16 flex flex-col items-start gap-6 rounded-xl border border-border bg-gradient-to-br from-purple-950/40 via-background to-background p-8 md:p-12">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span>The marketplace for AI image prompts</span>
        </div>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Discover, sell, and collect the best prompts — paid in Solana.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Unlock premium prompts with a single click. Creators earn 80% per sale, instantly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/explore">
            <Button size="lg" className="gap-2">
              Explore prompts <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="lg" variant="outline">Start selling</Button>
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" /> 80% to creators · 20% platform
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Rated by buyers (0–100)
          </div>
        </div>
      </section>

      {isEmpty ? (
        <section className="rounded-xl border border-dashed border-border p-12 text-center">
          <h2 className="mb-2 text-xl font-semibold">No prompts yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Be the first to share a prompt with the community.
          </p>
          <Link href="/upload">
            <Button>Upload the first prompt</Button>
          </Link>
        </section>
      ) : (
        <>
          {trending.length > 0 && (
            <Section title="Trending" href="/explore?sort=trending">
              <Grid items={trending} favoriteIds={favoriteIds} />
            </Section>
          )}
          {topRated.length > 0 && (
            <Section title="Top rated" href="/explore?sort=top">
              <Grid items={topRated} favoriteIds={favoriteIds} />
            </Section>
          )}
          <Section title="Recently uploaded" href="/explore?sort=newest">
            <Grid items={newest} favoriteIds={favoriteIds} />
          </Section>
        </>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-foreground/30 hover:bg-accent"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}

function Grid({
  items,
  favoriteIds,
}: {
  items: Awaited<ReturnType<typeof fetchPromptCards>>;
  favoriteIds: Set<string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((p) => (
        <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
      ))}
    </div>
  );
}
