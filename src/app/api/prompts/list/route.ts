import { NextRequest, NextResponse } from "next/server";
import { fetchPromptCards } from "@/lib/queries";

export const runtime = "nodejs";

/**
 * Paginated public prompt feed. Used by InfiniteFeed on the homepage
 * and /explore. Cursor is a simple offset (limit/offset). Fine for
 * thousands of rows; revisit if catalog grows past low millions.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const sort = (url.searchParams.get("sort") ?? "newest") as "newest" | "trending" | "top";
  const price = (url.searchParams.get("price") ?? "all") as "all" | "free" | "paid";
  const category = url.searchParams.get("category") ?? undefined;
  const platform = url.searchParams.get("platform") ?? undefined;
  const creatorId = url.searchParams.get("creator") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get("limit") ?? "24", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

  const items = await fetchPromptCards({
    orderBy: sort,
    priceFilter: price,
    categorySlug: category,
    platformSlug: platform,
    creatorId,
    search,
    limit,
    offset,
  });

  // hasMore = a full page came back. (Not perfectly accurate when total %
  // limit == 0, but cheap and good enough for "Load more" UX.)
  return NextResponse.json({
    items,
    nextOffset: offset + items.length,
    hasMore: items.length === limit,
  });
}
