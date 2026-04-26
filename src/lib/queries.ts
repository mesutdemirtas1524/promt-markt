import "server-only";
import { createSupabaseServiceClient } from "./supabase/server";
import type { PromptCardData } from "@/components/prompt-card";

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
      id, title, price_sol, avg_rating, rating_count, created_at, category_id, purchase_count, favorite_count, status,
      creator:users!creator_id ( username ),
      images:prompt_images ( image_url, position, width, height )
    `
    )
    .range(offset, offset + limit - 1);

  if (!opts.includeRemoved) query = query.eq("status", "active");

  if (opts.creatorId) query = query.eq("creator_id", opts.creatorId);
  if (opts.priceFilter === "free") query = query.eq("price_sol", 0);
  if (opts.priceFilter === "paid") query = query.gt("price_sol", 0);

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
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
    else return [];
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
    const cover = imgs[0];
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    return {
      id: p.id,
      title: p.title,
      price_sol: Number(p.price_sol),
      avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
      rating_count: p.rating_count,
      favorite_count: p.favorite_count ?? 0,
      cover_image: cover?.image_url ?? null,
      cover_width: cover?.width ?? null,
      cover_height: cover?.height ?? null,
      creator_username: creator?.username ?? "unknown",
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
        id, title, price_sol, avg_rating, rating_count, favorite_count, status,
        creator:users!creator_id ( username ),
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
        price_sol: Number(p.price_sol),
        avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
        rating_count: p.rating_count,
        favorite_count: p.favorite_count ?? 0,
        cover_image: cover?.image_url ?? null,
        cover_width: cover?.width ?? null,
        cover_height: cover?.height ?? null,
        creator_username: creator?.username ?? "unknown",
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
  const { data: prompt } = await supabase
    .from("prompts")
    .select(
      `
      *,
      creator:users!creator_id ( id, username, display_name, avatar_url, wallet_address ),
      images:prompt_images ( id, image_url, position, width, height ),
      category:categories ( id, name, slug ),
      platforms:prompt_platforms ( platforms ( id, name, slug ) )
    `
    )
    .eq("id", promptId)
    .maybeSingle();

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

  return {
    prompt: {
      ...prompt,
      prompt_text: hasAccess ? prompt.prompt_text : null,
      images,
      creator,
      category,
      platforms,
    },
    hasAccess,
    myRating,
    isFavorited,
    isOwnPrompt: viewerUserId === prompt.creator_id,
  };
}
