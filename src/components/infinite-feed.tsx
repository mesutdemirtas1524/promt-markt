"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PromptCard, PromptMasonry, type PromptCardData } from "./prompt-card";

type FilterParams = {
  sort?: "newest" | "trending" | "top";
  price?: "all" | "free" | "paid";
  category?: string;
  platform?: string;
  creator?: string;
  q?: string;
};

const PAGE_SIZE = 24;

/**
 * Renders an initial page of prompts (server-rendered) and infinitely
 * loads more from /api/prompts/list when an IntersectionObserver
 * sentinel scrolls into view.
 */
export function InfiniteFeed({
  initialItems,
  initialNextOffset,
  initialHasMore,
  filters,
}: {
  initialItems: PromptCardData[];
  initialNextOffset: number;
  initialHasMore: boolean;
  filters: FilterParams;
}) {
  const [items, setItems] = useState<PromptCardData[]>(initialItems);
  const [offset, setOffset] = useState(initialNextOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when filters change (parent re-renders this with new initial props)
  const filtersKey = JSON.stringify(filters);
  const lastKey = useRef(filtersKey);
  useEffect(() => {
    if (lastKey.current !== filtersKey) {
      lastKey.current = filtersKey;
      setItems(initialItems);
      setOffset(initialNextOffset);
      setHasMore(initialHasMore);
      setError(null);
    }
  }, [filtersKey, initialItems, initialNextOffset, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.price) params.set("price", filters.price);
      if (filters.category) params.set("category", filters.category);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.creator) params.set("creator", filters.creator);
      if (filters.q) params.set("q", filters.q);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/prompts/list?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        items: PromptCardData[];
        nextOffset: number;
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...data.items]);
      setOffset(data.nextOffset);
      setHasMore(data.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, offset, hasMore, loading]);

  // IntersectionObserver: trigger load when sentinel ~600px from bottom
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <PromptMasonry>
        {items.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
      </PromptMasonry>

      <div ref={sentinelRef} className="mt-6 flex h-16 items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more…
          </div>
        )}
        {!loading && hasMore && (
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-border bg-tint-1 px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
          >
            Load more
          </button>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-[11px] text-muted-foreground/70">— end of feed —</span>
        )}
        {error && (
          <button
            type="button"
            onClick={loadMore}
            className="text-xs text-destructive underline-offset-2 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    </>
  );
}
