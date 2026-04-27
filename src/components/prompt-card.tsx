"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const PANEL_GAP = 12;

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
  const hasMultiple = allImages.length > 1;

  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "below" | "above";
  } | null>(null);

  useEffect(() => setMounted(true), []);

  // Compute panel anchor: below the card by default; flip above if the
  // card is close to the viewport bottom so the panel never renders
  // off-screen.
  useEffect(() => {
    if (!hovered || !cardRef.current) {
      setPanelPos(null);
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const PANEL_HEIGHT = PANEL_THUMB_HEIGHT + 24; // thumb + panel padding
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const placement: "below" | "above" =
      spaceBelow >= PANEL_HEIGHT + PANEL_GAP || rect.top < PANEL_HEIGHT + PANEL_GAP
        ? "below"
        : "above";
    setPanelPos({
      top: placement === "below" ? rect.bottom + PANEL_GAP : rect.top - PANEL_GAP,
      left: rect.left + rect.width / 2,
      width: rect.width,
      placement,
    });
  }, [hovered]);

  function openOverlay() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHovered(true);
  }

  function scheduleClose() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    // Small grace window so the cursor can travel from the card into the
    // panel without flicker-closing.
    closeTimerRef.current = window.setTimeout(() => setHovered(false), 120);
  }

  // Card aspect locked to cover. No more cycling — the cover is what
  // sits in the masonry; the full gallery shows in the hover panel.
  const naturalRatio =
    prompt.cover_width && prompt.cover_height
      ? prompt.cover_width / prompt.cover_height
      : 1;
  const displayRatio = Math.max(0.55, Math.min(1.78, naturalRatio));
  const aspectStyle = { aspectRatio: String(displayRatio) };

  // Open the overlay on every hover, even for single-image cards — the
  // panel just shows the cover in that case. Avoids the "nothing
  // happens" feel.
  const showOverlay = hovered && allImages.length > 0;
  // Suppress the unused-var warning for hasMultiple while we keep the
  // computation in place for future tweaks.
  void hasMultiple;

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "ring-hover group relative inline-block w-full overflow-hidden rounded-xl border border-border bg-card break-inside-avoid",
          showOverlay && "z-[60]"
        )}
        onMouseEnter={openOverlay}
        onMouseLeave={scheduleClose}
      >
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

            {/* Top-right: price pill */}
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

            {/* Hover overlay — title, creator, stats. */}
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

        {/* "Already favorited" indicator when not hovering */}
        {favorited && (
          <div className="pointer-events-none absolute left-2 top-2 z-[5] transition-opacity duration-200 group-hover:opacity-0">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
              <Heart className="h-3.5 w-3.5 fill-current" />
            </div>
          </div>
        )}
      </div>

      {/* Backdrop blur over the rest of the page (portal so it isn't
          clipped by the masonry's column flow). */}
      {showOverlay && mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[55] bg-black/45 backdrop-blur-md" />,
          document.body
        )}

      {/* Gallery panel positioned just below (or above) the hovered card. */}
      {showOverlay && mounted && panelPos &&
        createPortal(
          <div
            className="fixed z-[60]"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              transform:
                panelPos.placement === "below"
                  ? "translateX(-50%)"
                  : "translate(-50%, -100%)",
              maxWidth: "min(960px, calc(100vw - 32px))",
            }}
            onMouseEnter={openOverlay}
            onMouseLeave={scheduleClose}
          >
            <div className="pointer-events-auto rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur">
              <div className="flex max-w-full gap-2 overflow-x-auto">
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
          </div>,
          document.body
        )}
    </>
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
