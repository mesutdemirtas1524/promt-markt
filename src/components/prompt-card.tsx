"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "./ui/badge";
import { Star, Heart, ShoppingBag } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "@/hooks/use-favorites";
import { formatUsd } from "@/lib/utils";
import { SolLogo } from "./sol-logo";

export type PromptCardData = {
  id: string;
  title: string;
  price_usd: number;
  price_sol: number;
  avg_rating: number | null;
  rating_count: number;
  favorite_count: number;
  purchase_count: number;
  cover_image: string | null;
  cover_width?: number | null;
  cover_height?: number | null;
  creator_username: string;
  creator_avatar_url?: string | null;
  status?: "active" | "removed";
};

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  const { isFavorited } = useFavorites();
  const favorited = isFavorited(prompt.id);
  const isRemoved = prompt.status === "removed";
  const isFree = prompt.price_usd <= 0;

  const renderUrl = prompt.cover_image;
  const aspectStyle =
    prompt.cover_width && prompt.cover_height
      ? { aspectRatio: `${prompt.cover_width} / ${prompt.cover_height}` }
      : undefined;

  return (
    <div className="ring-hover group relative inline-block w-full overflow-hidden rounded-xl border border-border bg-card break-inside-avoid">
      <Link href={`/prompt/${prompt.id}`} className="block">
        <div className="relative w-full overflow-hidden bg-muted" style={aspectStyle}>
          {renderUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={renderUrl}
              alt={prompt.title}
              loading="lazy"
              decoding="async"
              width={prompt.cover_width ?? undefined}
              height={prompt.cover_height ?? undefined}
              className="block h-auto w-full transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}

          {/* Bottom dark gradient — visible on hover for legibility */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Top-right: price pill */}
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
            {isFree ? (
              <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur">
                Free
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-white shadow-sm backdrop-blur-md">
                <SolLogo className="h-3 w-3" />
                <span className="text-[12px] font-bold tabular-nums leading-none">
                  {formatUsd(prompt.price_usd)}
                </span>
              </span>
            )}
            {isRemoved && <Badge variant="destructive">Removed</Badge>}
          </div>

          {/* Bottom-left: creator chip — only on hover */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur">
              {prompt.creator_avatar_url ? (
                <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={prompt.creator_avatar_url}
                    alt=""
                    fill
                    sizes="16px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full bg-white/15" />
              )}
              <span className="truncate">@{prompt.creator_username}</span>
            </div>
            {prompt.purchase_count > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] tabular-nums text-white backdrop-blur">
                <ShoppingBag className="h-2.5 w-2.5" />
                {prompt.purchase_count}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 p-3">
          <h3 className="line-clamp-1 text-[13px] font-medium leading-tight text-foreground">
            {prompt.title}
          </h3>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">@{prompt.creator_username}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              {prompt.favorite_count > 0 && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Heart className="h-3 w-3 fill-pink-400/80 text-pink-400/80" />
                  {prompt.favorite_count}
                </span>
              )}
              {prompt.rating_count > 0 && prompt.avg_rating !== null && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {Math.round(prompt.avg_rating)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Hover-revealed favorite toggle */}
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <FavoriteButton promptId={prompt.id} size="sm" />
      </div>

      {favorited && (
        <div className="absolute left-2 top-2 z-[5] pointer-events-none transition-opacity duration-200 group-hover:opacity-0">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrap a list of PromptCards in a CSS-columns masonry layout. */
export function PromptMasonry({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 [&>*]:mb-3">
      {children}
    </div>
  );
}
