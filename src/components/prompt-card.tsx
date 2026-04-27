"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  /** Gallery frames in display order, each with its own natural dimensions.
   *  We size the card to the active frame on hover so images fill without
   *  cropping or letterboxing. Capped server-side to keep payload small. */
  gallery_images?: PromptCardFrame[];
  creator_username: string;
  creator_avatar_url?: string | null;
  status?: "active" | "removed";
};

const HOVER_CYCLE_MS = 450;
const PREVIEW_WIDTH = 700;

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  const { isFavorited } = useFavorites();
  const favorited = isFavorited(prompt.id);
  const isRemoved = prompt.status === "removed";
  const isFree = prompt.price_usd <= 0;

  // Combine cover + gallery into ordered frames, dedupe by URL. Each
  // frame carries its own dimensions so we can resize the card aspect
  // ratio to match — no letterbox, no crop, no zoom on swap.
  const frames = useMemo<PromptCardFrame[]>(() => {
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
  const hasMultiple = frames.length > 1;

  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(0);
  // Don't request the extra frames until the user actually hovers — keeps
  // initial feed payload light. Once flipped, stays true so the user can
  // re-hover without refetching.
  const [loadedExtras, setLoadedExtras] = useState(false);
  // Some older gallery rows have null width/height in the DB. When the
  // browser actually loads the image we can read its natural dimensions
  // and store them here so the card aspect matches the picture exactly.
  const [measuredDims, setMeasuredDims] = useState<Record<string, { w: number; h: number }>>({});

  function recordDim(url: string, e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    setMeasuredDims((prev) => {
      if (prev[url]) return prev;
      return { ...prev, [url]: { w: img.naturalWidth, h: img.naturalHeight } };
    });
  }

  useEffect(() => {
    if (!hovered || !hasMultiple) return;
    if (!loadedExtras) setLoadedExtras(true);
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % frames.length);
    }, HOVER_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [hovered, hasMultiple, frames.length, loadedExtras]);

  // Reset to the cover frame when the cursor leaves so the card looks
  // identical to first-paint state.
  useEffect(() => {
    if (hovered) return;
    const t = window.setTimeout(() => setActive(0), 200);
    return () => window.clearTimeout(t);
  }, [hovered]);

  // Aspect ratio tracks the active frame so the image always fills the
  // card with no crop and no letterbox. Prefer measured natural dims
  // (most reliable) → DB dims → cover dims → 1:1 fallback. Loose clamp
  // keeps extreme panoramic/columnar shots from blowing up the layout.
  const activeFrame = frames[active] ?? frames[0];
  const measured = activeFrame ? measuredDims[activeFrame.url] : undefined;
  const w =
    measured?.w ?? activeFrame?.width ?? prompt.cover_width ?? null;
  const h =
    measured?.h ?? activeFrame?.height ?? prompt.cover_height ?? null;
  const naturalRatio = w && h ? w / h : 1;
  const displayRatio = Math.max(0.55, Math.min(1.78, naturalRatio));
  const aspectStyle = { aspectRatio: String(displayRatio) };

  return (
    <div
      className="ring-hover group relative inline-block w-full overflow-hidden rounded-xl border border-border bg-card break-inside-avoid"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/prompt/${prompt.id}`} className="block" aria-label={prompt.title}>
        <div className="relative w-full overflow-hidden bg-muted" style={aspectStyle}>
          {frames.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {/* Cover frame — always loaded so the card paints fast. */}
          {frames[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frames[0].url}
              alt={prompt.title}
              loading="lazy"
              decoding="async"
              onLoad={(e) => recordDim(frames[0].url, e)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                active === 0 ? "opacity-100" : "opacity-0"
              )}
            />
          )}
          {/* Extra frames — mounted only after first hover, then kept around. */}
          {loadedExtras &&
            frames.slice(1).map((frame, i) => {
              const idx = i + 1;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={frame.url}
                  src={renderImageUrl(frame.url, { width: PREVIEW_WIDTH, quality: 75 }) ?? frame.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => recordDim(frame.url, e)}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    active === idx ? "opacity-100" : "opacity-0"
                  )}
                />
              );
            })}

          {/* Frame dots — bottom-center pips that highlight the active
              image while the user is hovering on a multi-image card. */}
          {hasMultiple && (
            <div
              className={cn(
                "pointer-events-none absolute bottom-2 left-1/2 z-[6] flex -translate-x-1/2 gap-1 transition-opacity duration-200",
                hovered ? "opacity-100" : "opacity-0"
              )}
            >
              {frames.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-200",
                    i === active ? "w-4 bg-white" : "w-1 bg-white/55"
                  )}
                />
              ))}
            </div>
          )}

          {/* Top-right: price pill — the only thing visible by default. */}
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

          {/* Hover overlay — title, creator, stats. Hidden by default;
              fades in over a dark gradient when the user hovers. */}
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

      {/* Hover-revealed favorite toggle */}
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <FavoriteButton promptId={prompt.id} size="sm" />
      </div>

      {/* Subtle "already favorited" indicator — only when not hovering, so
          the user still gets feedback that they hearted this one. */}
      {favorited && (
        <div className="pointer-events-none absolute left-2 top-2 z-[5] transition-opacity duration-200 group-hover:opacity-0">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-current" />
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
