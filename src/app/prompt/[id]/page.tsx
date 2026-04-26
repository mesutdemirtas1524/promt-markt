import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  fetchPromptDetail,
  fetchCreatorStats,
  fetchPromptCards,
  fetchSimilarPrompts,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import { FollowButton } from "@/components/follow-button";
import { TipButton } from "@/components/tip-button";
import { ReportButton } from "@/components/report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptDetailActions } from "@/components/prompt-detail-actions";
import { FavoriteButton } from "@/components/favorite-button";
import { OwnerActions } from "@/components/owner-actions";
import { PromptGallery } from "@/components/image-lightbox";
import { ViewTracker } from "@/components/view-tracker";
import { formatRating, formatRelativeTime, formatSol } from "@/lib/utils";
import { Pencil, Star, Heart, ShoppingBag } from "lucide-react";

// Per-user state (isOwnPrompt, hasAccess, isFavorited) prevents safe ISR.
// generateMetadata still produces fresh OG tags each request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: prompt } = await supabase
    .from("prompts")
    .select(
      `id, title, description, price_sol, status,
       creator:users!creator_id ( username, display_name ),
       images:prompt_images ( image_url, position )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!prompt || prompt.status !== "active") {
    return { title: "Prompt not found" };
  }
  const creator = Array.isArray(prompt.creator) ? prompt.creator[0] : prompt.creator;
  const imgs = ((prompt.images ?? []) as { image_url: string; position: number }[]).sort(
    (a, b) => a.position - b.position
  );
  const cover = imgs[0]?.image_url;
  const price = Number(prompt.price_sol);
  const priceLabel = price === 0 ? "Free" : `${formatSol(price)} SOL`;
  const title = `${prompt.title} · ${priceLabel}`;
  const description = (prompt.description ?? "").slice(0, 200);
  const creatorName = creator?.display_name ?? `@${creator?.username ?? "creator"}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      authors: [creatorName],
      images: cover ? [{ url: cover, alt: prompt.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const result = await fetchPromptDetail(id, viewer?.id ?? null);
  if (!result) notFound();
  const { t } = await getServerT();

  const { prompt, hasAccess, myRating, isOwnPrompt, analysis } = result;
  const isRemoved = prompt.status === "removed";

  // Side fetches for trust signals: creator's other prompts + cumulative stats
  const [creatorStats, otherPrompts, similar] = await Promise.all([
    fetchCreatorStats(prompt.creator.id),
    fetchPromptCards({
      creatorId: prompt.creator.id,
      orderBy: "newest",
      limit: 8,
    }),
    fetchSimilarPrompts({
      promptId: prompt.id,
      excludeCreatorId: prompt.creator.id,
      categoryId: prompt.category?.id ?? null,
      platformIds: (prompt.platforms as Array<{ id: number }>).map((p) => p.id),
      limit: 6,
    }),
  ]);
  const moreFromCreator = otherPrompts.filter((p) => p.id !== prompt.id).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {!isRemoved && <ViewTracker promptId={prompt.id} />}
      {isRemoved && (
        <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm">
          <strong className="text-red-400">{t("detail.removed.title")}</strong>{" "}
          <span className="text-muted-foreground">
            {isOwnPrompt ? t("detail.removed.owner") : t("detail.removed.buyer")}
          </span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Gallery */}
        <div className="lg:col-span-3">
          {prompt.images.length > 0 ? (
            <PromptGallery images={prompt.images} alt={prompt.title} />
          ) : (
            <div className="aspect-square w-full rounded-2xl border border-dashed border-border bg-muted" />
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-5 lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {prompt.category && <Badge variant="secondary">{prompt.category.name}</Badge>}
              {prompt.platforms.map((p: { id: number; name: string }) => (
                <Badge key={p.id} variant="outline">
                  {p.name}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {prompt.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{prompt.description}</p>
          </div>

          {/* Creator */}
          <div className="rounded-xl border border-border bg-tint-1 p-3 transition-all hover:bg-tint-2">
            <Link href={`/u/${prompt.creator.username}`} className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                {prompt.creator.avatar_url && (
                  <Image
                    src={prompt.creator.avatar_url}
                    alt={prompt.creator.display_name ?? prompt.creator.username}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium tracking-tight">
                  {prompt.creator.display_name ?? `@${prompt.creator.username}`}
                </div>
                {prompt.creator.display_name && (
                  <div className="truncate text-xs text-muted-foreground">@{prompt.creator.username}</div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(prompt.created_at)} · {prompt.purchase_count} {t("detail.sales")}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <span className="text-foreground">{creatorStats.activePrompts}</span> prompts ·{" "}
                  <span className="text-foreground">{creatorStats.totalSales}</span> total sales
                </div>
              </div>
            </Link>
            {!isOwnPrompt && (
              <div className="mt-3 flex items-center gap-2">
                <FollowButton
                  targetUserId={prompt.creator.id}
                  targetUsername={prompt.creator.username}
                  hideForSelfId={viewer?.id ?? null}
                  size="sm"
                  className="flex-1 justify-center"
                />
                {prompt.creator.wallet_address && (
                  <TipButton
                    creatorWallet={prompt.creator.wallet_address}
                    creatorUsername={prompt.creator.username}
                    size="sm"
                  />
                )}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <Stat
              icon={<Star className="h-3.5 w-3.5 text-amber-300" />}
              label={t("detail.stat.rating")}
              value={formatRating(prompt.avg_rating, prompt.rating_count)}
            />
            <Stat
              icon={<Heart className="h-3.5 w-3.5 text-pink-400" />}
              label={t("detail.stat.favorites")}
              value={String(prompt.favorite_count ?? 0)}
            />
            <Stat
              icon={<ShoppingBag className="h-3.5 w-3.5 text-violet-300" />}
              label={t("detail.stat.sales")}
              value={String(prompt.purchase_count ?? 0)}
            />
          </div>

          {!isOwnPrompt && (
            <FavoriteButton
              promptId={prompt.id}
              size="md"
              showLabel
              initialCount={prompt.favorite_count ?? 0}
            />
          )}

          {isOwnPrompt && !isRemoved && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/listings/${prompt.id}/edit`} className="flex-1">
                <Button variant="outline" className="w-full gap-1.5">
                  <Pencil className="h-4 w-4" />
                  {t("detail.edit")}
                </Button>
              </Link>
              <OwnerActions promptId={prompt.id} />
            </div>
          )}

          {!isOwnPrompt && (
            <div className="flex justify-end">
              <ReportButton promptId={prompt.id} />
            </div>
          )}

          <PromptDetailActions
            promptId={prompt.id}
            priceSol={Number(prompt.price_sol)}
            creatorWallet={prompt.creator.wallet_address}
            hasAccess={hasAccess}
            isOwnPrompt={isOwnPrompt}
            myRating={myRating}
            promptText={prompt.prompt_text}
            analysis={analysis}
          />
        </div>
      </div>

      {moreFromCreator.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              More from{" "}
              <Link href={`/u/${prompt.creator.username}`} className="text-violet-300 hover:underline">
                {prompt.creator.display_name ?? `@${prompt.creator.username}`}
              </Link>
            </h2>
            <Link
              href={`/u/${prompt.creator.username}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View profile →
            </Link>
          </div>
          <PromptMasonry>
            {moreFromCreator.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </PromptMasonry>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">You might also like</h2>
            <Link
              href="/explore"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Browse more →
            </Link>
          </div>
          <PromptMasonry>
            {similar.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </PromptMasonry>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-tint-1 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
