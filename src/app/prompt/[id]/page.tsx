import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchPromptDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptDetailActions } from "@/components/prompt-detail-actions";
import { FavoriteButton } from "@/components/favorite-button";
import { OwnerActions } from "@/components/owner-actions";
import { PromptGallery } from "@/components/image-lightbox";
import { formatRating, formatRelativeTime } from "@/lib/utils";
import { Pencil, Star, Heart, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const result = await fetchPromptDetail(id, viewer?.id ?? null);
  if (!result) notFound();
  const { t } = await getServerT();

  const { prompt, hasAccess, myRating, isOwnPrompt, isFavorited } = result;
  const isRemoved = prompt.status === "removed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
          <Link
            href={`/u/${prompt.creator.username}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-tint-1 p-3 transition-all hover:bg-tint-2"
          >
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
            </div>
          </Link>

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
              initiallyFavorited={isFavorited}
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

          <PromptDetailActions
            promptId={prompt.id}
            priceSol={Number(prompt.price_sol)}
            creatorWallet={prompt.creator.wallet_address}
            hasAccess={hasAccess}
            isOwnPrompt={isOwnPrompt}
            myRating={myRating}
            promptText={prompt.prompt_text}
          />
        </div>
      </div>
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
