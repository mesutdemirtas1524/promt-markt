"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Star, Heart, ShoppingBag } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "@/hooks/use-favorites";
import { formatUsd, cn } from "@/lib/utils";
import { renderImageUrl } from "@/lib/image";
import { SolLogo } from "./sol-logo";

export type PromptCardFrame = {
  url: string;
  width: number | null;
  height: number | null;
};

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
  /** Gallery image URLs (with dims) — shown together in the hover panel. */
  gallery_images?: PromptCardFrame[];
  creator_username: string;
  creator_avatar_url?: string | null;
  status?: "active" | "removed";
};

const PANEL_THUMB_HEIGHT = 220;

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  const { isFavorited } = useFavorites();
  const favorited = isFavorited(prompt.id);
  const isRemoved = prompt.status === "removed";
  const isFree = prompt.price_usd <= 0;

  // Cover + gallery, deduped, in display order.
  const allImages = useMemo<PromptCardFrame[]>(() => {
    const cover: PromptCardFrame | null = prompt.cover_image
      ? {
          url: prompt.cover_image,
          width: prompt.cover_width ?? null,
          height: prompt.cover_height ?? null,
        }
      : null;
    const gallery = prompt.gallery_images ?? [];
    const seen = new Set<string>();
    const out: PromptCardFrame[] = [];
    for (const f of [cover, ...gallery]) {
      if (!f || seen.has(f.url)) continue;
      seen.add(f.url);
      out.push(f);
    }
    return out;
  }, [prompt.cover_image, prompt.cover_width, prompt.cover_height, prompt.gallery_images]);

  const [hovered, setHovered] = useState(false);

  // Card aspect locked to cover.
  const naturalRatio =
    prompt.cover_width && prompt.cover_height
      ? prompt.cover_width / prompt.cover_height
      : 1;
  const displayRatio = Math.max(0.55, Math.min(1.78, naturalRatio));
  const aspectStyle = { aspectRatio: String(displayRatio) };

  return (
    <div
      className={cn(
        "ring-hover relative inline-block w-full break-inside-avoid",
        hovered && "z-[60]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Backdrop blur — sibling to the card so it can't be clipped by
          the masonry's column flow. Fixed-position so it covers the
          whole viewport. */}
      {hovered && (
        <div
          className="pointer-events-none fixed inset-0 z-[55] bg-black/45 backdrop-blur-md"
          aria-hidden
        />
      )}

      {/* The card itself. Lifted to z-[60] when hovered so it shows
          above the backdrop. */}
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card">
        <Link href={`/prompt/${prompt.id}`} className="block" aria-label={prompt.title}>
          <div className="relative w-full overflow-hidden bg-muted" style={aspectStyle}>
            {prompt.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prompt.cover_image}
                alt={prompt.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}

            <div className="absolute right-2 top-2 z-[5] flex flex-col items-end gap-1.5">
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

            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-10 text-white">
                <h3 className="mb-2 line-clamp-2 text-[13px] font-semibold leading-snug drop-shadow">
                  {prompt.title}
                </h3>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {prompt.creator_avatar_url ? (
                      <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-white/30">
                        <Image
                          src={prompt.creator_avatar_url}
                          alt=""
                          fill
                          sizes="16px"
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full bg-white/20" />
                    )}
                    <span className="truncate opacity-90">@{prompt.creator_username}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 opacity-90">
                    {prompt.purchase_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <ShoppingBag className="h-3 w-3" />
                        {prompt.purchase_count}
                      </span>
                    )}
                    {prompt.favorite_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <Heart className="h-3 w-3 fill-pink-400 text-pink-400" />
                        {prompt.favorite_count}
                      </span>
                    )}
                    {prompt.rating_count > 0 && prompt.avg_rating !== null && (
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                        {Math.round(prompt.avg_rating)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <FavoriteButton promptId={prompt.id} size="sm" />
        </div>

        {favorited && (
          <div className="pointer-events-none absolute left-2 top-2 z-[5] transition-opacity duration-200 group-hover:opacity-0">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </div>
          </div>
        )}
      </div>

      {/* Gallery panel — anchored just below the card, shown on hover.
          Sits in the same wrapper as the card so it shares hover state
          and inherits the card's z-lift. */}
      {hovered && allImages.length > 0 && (
        <div className="absolute left-1/2 top-full z-[60] mt-3 w-max -translate-x-1/2">
          <div className="rounded-xl border border-border bg-card p-2 shadow-2xl">
            <div className="flex max-w-[min(960px,calc(100vw-32px))] gap-2 overflow-x-auto">
              {allImages.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.url}
                  src={
                    renderImageUrl(img.url, { height: PANEL_THUMB_HEIGHT * 2, quality: 80 }) ??
                    img.url
                  }
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="block shrink-0 rounded-md"
                  style={{ height: PANEL_THUMB_HEIGHT, width: "auto" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrap a list of PromptCards in a CSS-columns masonry layout.
 *  Fixed at 4 columns from lg upward — cards stretch to fill the
 *  available width rather than packing more in. */
export function PromptMasonry({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-2 gap-4 sm:columns-2 md:columns-3 lg:columns-4 [&>*]:mb-4">
      {children}
    </div>
  );
}
