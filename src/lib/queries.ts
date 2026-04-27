import "server-only";
import { createSupabaseServiceClient } from "./supabase/server";
import type { PromptCardData } from "@/components/prompt-card";
import { analyzePrompt, type PromptAnalysis } from "./prompt-analysis";

/**
 * Fetch a list of prompts (without prompt_text) for browsing pages,
 * including cover image and creator username.
 */
export async function fetchPromptCards(opts: {
  limit?: number;
  offset?: number;
  orderBy?: "newest" | "top" | "trending";
  categorySlug?: string;
  platformSlug?: string;
  creatorId?: string;
  priceFilter?: "free" | "paid" | "all";
  priceMin?: number;
  priceMax?: number;
  search?: string;
  includeRemoved?: boolean;
}): Promise<PromptCardData[]> {
  const supabase = createSupabaseServiceClient();
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  let query = supabase
    .from("prompts")
    .select(
      `
      id, title, price_usd, price_sol, cover_image_url, cover_width, cover_height, avg_rating, rating_count, created_at, category_id, purchase_count, favorite_count, status,
      creator:users!creator_id ( username, avatar_url ),
      images:prompt_images ( image_url, position, width, height )
    `
    )
    .range(offset, offset + limit - 1);

  if (!opts.includeRemoved) query = query.eq("status", "active");

  if (opts.creatorId) query = query.eq("creator_id", opts.creatorId);
  if (opts.priceFilter === "free") query = query.eq("price_sol", 0);
  if (opts.priceFilter === "paid") query = query.gt("price_sol", 0);
  // priceMin / priceMax are now USD values (the canonical price field).
  if (typeof opts.priceMin === "number" && opts.priceMin > 0) {
    query = query.gte("price_usd", opts.priceMin);
  }
  if (typeof opts.priceMax === "number" && opts.priceMax > 0) {
    query = query.lte("price_usd", opts.priceMax);
  }

  const searchTerm = opts.search?.trim();
  if (searchTerm) {
    const escaped = searchTerm.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  if (opts.orderBy === "top") {
    query = query.order("avg_rating", { ascending: false, nullsFirst: false });
  } else if (opts.orderBy === "trending") {
    // "Trending" = popular among prompts uploaded in the last 30 days.
    // Prevents the all-time most-purchased prompt from squatting at the
    // top forever — new viral content can break through.
    const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    query = query
      .gte("created_at", new Date(cutoffMs).toISOString())
      .order("purchase_count", { ascending: false })
      .order("favorite_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (opts.categorySlug) {
    // Filter through the prompt_categories join so a prompt tagged with
    // multiple categories matches each one. Falls back to the legacy
    // category_id column for any rows the migration hasn't touched yet.
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (!cat) return [];
    const { data: matches } = await supabase
      .from("prompt_categories")
      .select("prompt_id")
      .eq("category_id", cat.id);
    const ids = (matches ?? []).map((m) => m.prompt_id as string);
    if (ids.length === 0) {
      query = query.eq("category_id", cat.id);
    } else {
      query = query.in("id", ids);
    }
  }

  if (opts.platformSlug) {
    // Two-step filter: look up platform_id, then restrict prompts to those
    // that have a row in prompt_platforms with that id. A direct join filter
    // through PostgREST is awkward; this is fine at our scale.
    const { data: pl } = await supabase
      .from("platforms")
      .select("id")
      .eq("slug", opts.platformSlug)
      .maybeSingle();
    if (!pl) return [];
    const { data: matches } = await supabase
      .from("prompt_platforms")
      .select("prompt_id")
      .eq("platform_id", pl.id);
    const ids = (matches ?? []).map((m) => m.prompt_id as string);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((p) => {
    const imgs = (p.images ?? []) as {
      image_url: string;
      position: number;
      width: number | null;
      height: number | null;
    }[];
    imgs.sort((a, b) => a.position - b.position);
    const firstImage = imgs[0];
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    return {
      id: p.id,
      title: p.title,
      price_usd: Number(p.price_usd ?? 0),
      price_sol: Number(p.price_sol),
      avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
      rating_count: p.rating_count,
      favorite_count: p.favorite_count ?? 0,
      purchase_count: p.purchase_count ?? 0,
      cover_image: p.cover_image_url ?? firstImage?.image_url ?? null,
      cover_width: p.cover_width ?? firstImage?.width ?? null,
      cover_height: p.cover_height ?? firstImage?.height ?? null,
      gallery_images: imgs.slice(0, 5).map((i) => ({
        url: i.image_url,
        width: i.width ?? null,
        height: i.height ?? null,
      })),
      creator_username: creator?.username ?? "unknown",
      creator_avatar_url: (creator as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      status: (p.status as "active" | "removed") ?? "active",
    };
  });
}

/** Fetch a list of prompts a user has favorited (joined with prompt details). */
export async function fetchFavoritedPrompts(userId: string, limit = 48): Promise<PromptCardData[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("favorites")
    .select(
      `
      created_at,
      prompt:prompts!inner (
        id, title, price_usd, price_sol, cover_image_url, cover_width, cover_height, avg_rating, rating_count, favorite_count, purchase_count, status,
        creator:users!creator_id ( username, avatar_url ),
        images:prompt_images ( image_url, position, width, height )
      )
    `
    )
    .eq("user_id", userId)
    .eq("prompt.status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((row) => {
      const p = Array.isArray(row.prompt) ? row.prompt[0] : row.prompt;
      if (!p) return null;
      const imgs = ((p.images ?? []) as {
        image_url: string;
        position: number;
        width: number | null;
        height: number | null;
      }[]).sort((a, b) => a.position - b.position);
      const cover = imgs[0];
      const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
      return {
        id: p.id,
        title: p.title,
        price_usd: Number(p.price_usd ?? 0),
        price_sol: Number(p.price_sol),
        avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
        rating_count: p.rating_count,
        favorite_count: p.favorite_count ?? 0,
        purchase_count: p.purchase_count ?? 0,
        cover_image: (p as { cover_image_url?: string | null }).cover_image_url ?? cover?.image_url ?? null,
        cover_width: (p as { cover_width?: number | null }).cover_width ?? cover?.width ?? null,
        cover_height: (p as { cover_height?: number | null }).cover_height ?? cover?.height ?? null,
        gallery_images: imgs.slice(0, 5).map((i) => ({
        url: i.image_url,
        width: i.width ?? null,
        height: i.height ?? null,
      })),
        creator_username: creator?.username ?? "unknown",
        creator_avatar_url: (creator as { avatar_url?: string | null } | null)?.avatar_url ?? null,
        status: (p.status as "active" | "removed") ?? "active",
      } as PromptCardData;
    })
    .filter((x): x is PromptCardData => x !== null);
}

/** Fetch the set of prompt IDs the user has favorited (for hydrating heart state). */
export async function fetchUserFavoriteIds(userId: string): Promise<Set<string>> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("favorites").select("prompt_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.prompt_id as string));
}

export async function fetchCategories() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return data ?? [];
}

export async function fetchPlatforms() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("platforms").select("*").order("name");
  return data ?? [];
}

export async function fetchPromptDetail(promptId: string, viewerUserId: string | null) {
  const supabase = createSupabaseServiceClient();
  // Try the full select with the multi-category join. If the join table
  // hasn't been migrated yet, retry without it so the detail page still
  // renders — we'll just have the legacy single category until the
  // operator runs migration 015.
  // PostgREST disambiguation: now that prompt_categories exists there are
  // TWO relationships between prompts and categories — the legacy
  // prompts.category_id FK and the new join table. Embedding `categories`
  // without naming the path silently breaks the whole query. We pin each
  // join to its FK column with the !fk_column hint.
  const fullSelect = `
      *,
      creator:users!creator_id ( id, username, display_name, avatar_url, wallet_address ),
      images:prompt_images ( id, image_url, position, width, height ),
      category:categories!category_id ( id, name, slug ),
      categories:prompt_categories ( category:categories!category_id ( id, name, slug ) ),
      platforms:prompt_platforms ( platforms ( id, name, slug ) )
    `;
  const fallbackSelect = `
      *,
      creator:users!creator_id ( id, username, display_name, avatar_url, wallet_address ),
      images:prompt_images ( id, image_url, position, width, height ),
      category:categories!category_id ( id, name, slug ),
      platforms:prompt_platforms ( platforms ( id, name, slug ) )
    `;

  // The supabase client is heavily typed off the relational select string,
  // so we erase that here and re-narrow at the consumption site below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prompt: any = null;
  const full = await supabase.from("prompts").select(fullSelect).eq("id", promptId).maybeSingle();
  if (full.error) {
    console.warn(
      "fetchPromptDetail: full select failed, retrying without join:",
      full.error.message
    );
    const lite = await supabase
      .from("prompts")
      .select(fallbackSelect)
      .eq("id", promptId)
      .maybeSingle();
    prompt = lite.data ?? null;
  } else {
    prompt = full.data ?? null;
  }

  if (!prompt) return null;

  let hasPurchased = false;
  if (viewerUserId && viewerUserId !== prompt.creator_id) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("buyer_id", viewerUserId)
      .eq("prompt_id", promptId)
      .maybeSingle();
    hasPurchased = Boolean(purchase);
  }
  const isOwner = Boolean(viewerUserId && viewerUserId === prompt.creator_id);

  // Removed prompts are only visible to the creator and to past buyers.
  if (prompt.status !== "active" && !isOwner && !hasPurchased) return null;

  let hasAccess = false;
  if (isOwner || hasPurchased) {
    hasAccess = true;
  } else if (prompt.status === "active" && prompt.price_sol === 0 && viewerUserId) {
    hasAccess = true;
  }

  let myRating: number | null = null;
  let isFavorited = false;
  if (viewerUserId) {
    const [ratingRes, favRes] = await Promise.all([
      supabase
        .from("ratings")
        .select("stars")
        .eq("rater_id", viewerUserId)
        .eq("prompt_id", promptId)
        .maybeSingle(),
      supabase
        .from("favorites")
        .select("user_id")
        .eq("user_id", viewerUserId)
        .eq("prompt_id", promptId)
        .maybeSingle(),
    ]);
    myRating = ratingRes.data?.stars ?? null;
    isFavorited = Boolean(favRes.data);
  }

  const images = [...((prompt.images ?? []) as { position: number }[])].sort(
    (a, b) => a.position - b.position
  );
  const creator = Array.isArray(prompt.creator) ? prompt.creator[0] : prompt.creator;
  const category = Array.isArray(prompt.category) ? prompt.category[0] : prompt.category;
  const platforms = ((prompt.platforms ?? []) as Array<{ platforms: unknown }>)
    .map((row) => (Array.isArray(row.platforms) ? row.platforms[0] : row.platforms))
    .filter(Boolean);
  // The join row has shape `{ category: { id, name, slug } }` (we aliased
  // the inner embed to disambiguate the relationship to categories).
  const categoriesList = ((prompt.categories ?? []) as Array<{ category: unknown }>)
    .map((row) => (Array.isArray(row.category) ? row.category[0] : row.category))
    .filter(Boolean);
  // If the join table is empty (legacy row), fall back to the single
  // category column so the badges still render something.
  const allCategories =
    categoriesList.length > 0
      ? categoriesList
      : category
        ? [category]
        : [];

  // Always compute analysis from the FULL prompt text on the server, even
  // when we won't return prompt_text to the client. The analysis surfaces
  // structural meta (length, placeholders, parameters) without leaking
  // the actual prompt — useful preview signal on the locked block.
  const analysis: PromptAnalysis | null = prompt.prompt_text
    ? analyzePrompt(prompt.prompt_text as string)
    : null;

  return {
    prompt: {
      ...prompt,
      prompt_text: hasAccess ? prompt.prompt_text : null,
      images,
      creator,
      category,
      categories: allCategories,
      platforms,
    },
    hasAccess,
    myRating,
    isFavorited,
    isOwnPrompt: viewerUserId === prompt.creator_id,
    analysis,
  };
}

export type PublicStats = {
  activePrompts: number;
  activeCreators: number;
  recentSales: number;
  recentVolumeSol: number;
};

/**
 * Marketplace-wide totals + recent activity, used as a credibility
 * strip on the home hero. `recent*` fields cover the last 30 days.
 */
export async function fetchPublicStats(): Promise<PublicStats> {
  const supabase = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: activePrompts }, creatorsRes, recentRes] = await Promise.all([
    supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("prompts")
      .select("creator_id")
      .eq("status", "active"),
    supabase
      .from("purchases")
      .select("price_paid_sol")
      .gte("created_at", cutoff),
  ]);

  const activeCreators = new Set(
    ((creatorsRes.data ?? []) as Array<{ creator_id: string }>).map((r) => r.creator_id)
  ).size;

  const recentRows = (recentRes.data ?? []) as Array<{ price_paid_sol: number | string | null }>;
  const recentVolumeSol = recentRows.reduce((s, r) => s + Number(r.price_paid_sol ?? 0), 0);

  return {
    activePrompts: activePrompts ?? 0,
    activeCreators,
    recentSales: recentRows.length,
    recentVolumeSol,
  };
}

export type TrendingCreator = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  recent_sales: number;
  recent_volume_sol: number;
  active_prompts: number;
};

/**
 * Top creators ranked by sales in the last `days` window. We pull
 * recent purchases, group by creator, then hydrate the user rows in
 * a second query. Two round-trips beats a complex Postgres view at
 * our scale and stays easy to tweak.
 */
export async function fetchTrendingCreators(days = 30, limit = 24): Promise<TrendingCreator[]> {
  const supabase = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("price_paid_sol, prompt:prompts!inner(creator_id)")
    .gte("created_at", cutoff);

  const tally = new Map<string, { sales: number; volume: number }>();
  for (const r of (purchases ?? []) as Array<{
    price_paid_sol: number | string | null;
    prompt: { creator_id: string } | { creator_id: string }[] | null;
  }>) {
    const p = Array.isArray(r.prompt) ? r.prompt[0] : r.prompt;
    if (!p) continue;
    const cur = tally.get(p.creator_id) ?? { sales: 0, volume: 0 };
    cur.sales += 1;
    cur.volume += Number(r.price_paid_sol ?? 0);
    tally.set(p.creator_id, cur);
  }

  const ranked = Array.from(tally.entries())
    .sort((a, b) => b[1].volume - a[1].volume || b[1].sales - a[1].sales)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const creatorIds = ranked.map(([id]) => id);
  const [{ data: users }, { data: counts }] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, display_name, avatar_url, bio, follower_count")
      .in("id", creatorIds),
    supabase
      .from("prompts")
      .select("creator_id")
      .in("creator_id", creatorIds)
      .eq("status", "active"),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const promptCounts = new Map<string, number>();
  for (const c of counts ?? []) {
    promptCounts.set(c.creator_id, (promptCounts.get(c.creator_id) ?? 0) + 1);
  }

  return ranked
    .map(([id, stats]) => {
      const u = userMap.get(id);
      if (!u) return null;
      return {
        id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        bio: u.bio,
        follower_count: u.follower_count ?? 0,
        recent_sales: stats.sales,
        recent_volume_sol: stats.volume,
        active_prompts: promptCounts.get(id) ?? 0,
      };
    })
    .filter((x): x is TrendingCreator => x !== null);
}

/**
 * "You might also like" — cross-creator recommendations for a prompt.
 *
 * Score: same category (+3) + at least one shared platform (+2 each) +
 * recency tiebreaker. Excludes the source creator (those are shown in
 * "More from creator") and the source prompt itself.
 */
export async function fetchSimilarPrompts(opts: {
  promptId: string;
  excludeCreatorId: string;
  categoryId: number | null;
  platformIds: number[];
  limit?: number;
}): Promise<PromptCardData[]> {
  const supabase = createSupabaseServiceClient();
  const limit = opts.limit ?? 6;

  // Pull a candidate pool: same category OR shares a platform. We over-fetch
  // and re-rank in JS because PostgREST can't easily express the scoring.
  const candidateIds = new Set<string>();

  if (opts.categoryId !== null) {
    const { data } = await supabase
      .from("prompts")
      .select("id")
      .eq("status", "active")
      .eq("category_id", opts.categoryId)
      .neq("creator_id", opts.excludeCreatorId)
      .neq("id", opts.promptId)
      .order("purchase_count", { ascending: false })
      .limit(40);
    for (const r of data ?? []) candidateIds.add(r.id as string);
  }

  if (opts.platformIds.length > 0) {
    const { data } = await supabase
      .from("prompt_platforms")
      .select("prompt_id, prompt:prompts!inner(creator_id, status)")
      .in("platform_id", opts.platformIds)
      .neq("prompt_id", opts.promptId);
    for (const row of (data ?? []) as Array<{
      prompt_id: string;
      prompt: { creator_id: string; status: string } | { creator_id: string; status: string }[] | null;
    }>) {
      const p = Array.isArray(row.prompt) ? row.prompt[0] : row.prompt;
      if (!p || p.status !== "active" || p.creator_id === opts.excludeCreatorId) continue;
      candidateIds.add(row.prompt_id);
    }
  }

  if (candidateIds.size === 0) return [];

  const { data: rows } = await supabase
    .from("prompts")
    .select(
      `
      id, title, price_usd, price_sol, cover_image_url, cover_width, cover_height, avg_rating, rating_count, created_at, category_id, purchase_count, favorite_count, status,
      creator:users!creator_id ( username, avatar_url ),
      images:prompt_images ( image_url, position, width, height ),
      platforms:prompt_platforms ( platform_id )
    `
    )
    .in("id", Array.from(candidateIds))
    .eq("status", "active");

  const sourcePlatforms = new Set(opts.platformIds);
  const scored = (rows ?? []).map((p) => {
    const platforms = (p.platforms ?? []) as { platform_id: number }[];
    const sharedPlatforms = platforms.filter((pl) => sourcePlatforms.has(pl.platform_id)).length;
    const score =
      (p.category_id === opts.categoryId ? 3 : 0) +
      sharedPlatforms * 2 +
      Math.min(2, Math.log10((p.purchase_count ?? 0) + 1)) +
      Math.min(1, (Number(p.avg_rating ?? 0) - 3) / 2);
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ p }) => {
    const imgs = (p.images ?? []) as {
      image_url: string;
      position: number;
      width: number | null;
      height: number | null;
    }[];
    imgs.sort((a, b) => a.position - b.position);
    const firstImage = imgs[0];
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    const pp = p as {
      cover_image_url?: string | null;
      cover_width?: number | null;
      cover_height?: number | null;
    };
    return {
      id: p.id,
      title: p.title,
      price_usd: Number(p.price_usd ?? 0),
      price_sol: Number(p.price_sol),
      avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
      rating_count: p.rating_count,
      favorite_count: p.favorite_count ?? 0,
      purchase_count: p.purchase_count ?? 0,
      cover_image: pp.cover_image_url ?? firstImage?.image_url ?? null,
      cover_width: pp.cover_width ?? firstImage?.width ?? null,
      cover_height: pp.cover_height ?? firstImage?.height ?? null,
      gallery_images: imgs.slice(0, 5).map((i) => ({
        url: i.image_url,
        width: i.width ?? null,
        height: i.height ?? null,
      })),
      creator_username: creator?.username ?? "unknown",
      creator_avatar_url: (creator as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      status: (p.status as "active" | "removed") ?? "active",
    };
  });
}

/**
 * Lightweight creator profile stats — total active prompts + total sales
 * across all of them. Shown on the prompt detail page next to the creator
 * card as a trust signal.
 */
export async function fetchCreatorStats(creatorId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, count } = await supabase
    .from("prompts")
    .select("purchase_count", { count: "exact" })
    .eq("creator_id", creatorId)
    .eq("status", "active");
  const totalSales = (data ?? []).reduce((s, r) => s + (r.purchase_count ?? 0), 0);
  return {
    activePrompts: count ?? 0,
    totalSales,
  };
}
