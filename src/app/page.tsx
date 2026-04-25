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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Hero */}
      <section className="relative mb-20 overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 25% 0%, rgba(167, 139, 250, 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(244, 114, 182, 0.10), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-start gap-7 p-10 md:p-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-violet-300" />
            <span className="tracking-tight">The marketplace for AI image prompts</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Discover, sell, and collect <br className="hidden md:inline" />
            <span className="text-gradient-violet">the best prompts</span>{" "}
            <span className="text-muted-foreground/70">— paid in Solana.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Unlock premium prompts with a single click. Creators earn 80% per sale, instantly on-chain.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore">
              <Button size="lg" variant="primary" className="gap-2">
                Explore prompts <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="lg" variant="outline">
                Start selling
              </Button>
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-violet-300/80" /> 80% to creators · 20% platform
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-300/80" /> Rated by buyers (0–100)
            </div>
          </div>
        </div>
      </section>

      {isEmpty ? (
        <section className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-16 text-center">
          <h2 className="mb-2 text-xl font-semibold tracking-tight">No prompts yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Be the first to share a prompt with the community.
          </p>
          <Link href="/upload">
            <Button variant="primary">Upload the first prompt</Button>
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
        <section className="mt-20">
          <h2 className="mb-5 text-base font-semibold tracking-tight">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
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
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
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
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
      {items.map((p) => (
        <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
      ))}
    </div>
  );
}
