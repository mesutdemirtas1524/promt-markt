import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchTrendingCreators } from "@/lib/queries";
import { PriceTag } from "@/components/price-tag";
import { Compass, Trophy } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Top creators",
  description: "The most active creators on Promt Markt over the last 30 days.",
};

export default async function CreatorsPage() {
  const creators = await fetchTrendingCreators(30, 60);

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium tracking-wider text-violet-300">
          <Trophy className="h-3 w-3" />
          LAST 30 DAYS
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Top creators</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Ranked by sales volume in the last 30 days. A new creator at the top means a
          single great prompt is selling — not legacy reputation.
        </p>
      </header>

      {creators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          <Compass className="mx-auto mb-3 h-5 w-5 opacity-50" />
          No sales recorded in the last 30 days yet. Check back soon.
        </div>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/u/${c.username}`}
                className="group flex h-full gap-3 rounded-xl border border-border bg-card p-4 ring-hover hover:bg-tint-1"
              >
                <div className="relative shrink-0">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                    {c.avatar_url && (
                      <Image
                        src={c.avatar_url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border border-border bg-background px-1 text-[10px] font-semibold tabular-nums">
                    #{i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold tracking-tight">
                    {c.display_name ?? `@${c.username}`}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">@{c.username}</div>
                  {c.bio && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/85">
                      {c.bio}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="tabular-nums">
                      <strong className="text-foreground">{c.recent_sales}</strong>{" "}
                      <span className="text-muted-foreground">sales</span>
                    </span>
                    <span className="tabular-nums text-foreground">
                      <PriceTag sol={c.recent_volume_sol} size="xs" />
                    </span>
                    <span className="tabular-nums">
                      <strong className="text-foreground">{c.active_prompts}</strong>{" "}
                      <span className="text-muted-foreground">prompts</span>
                    </span>
                    <span className="tabular-nums">
                      <strong className="text-foreground">{c.follower_count}</strong>{" "}
                      <span className="text-muted-foreground">followers</span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
