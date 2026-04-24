import "server-only";
import { createSupabaseServiceClient } from "./supabase/server";
import type { PromptCardData } from "@/components/prompt-card";

/**
 * Fetch a list of prompts (without prompt_text) for browsing pages,
 * including cover image and creator username.
 */
export async function fetchPromptCards(opts: {
  limit?: number;
  orderBy?: "newest" | "top" | "trending";
  categorySlug?: string;
  platformSlug?: string;
  creatorId?: string;
  priceFilter?: "free" | "paid" | "all";
}): Promise<PromptCardData[]> {
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("prompts")
    .select(
      `
      id, title, price_sol, avg_rating, rating_count, created_at, category_id, purchase_count,
      creator:users!creator_id ( username ),
      images:prompt_images ( image_url, position )
    `
    )
    .eq("status", "active")
    .limit(opts.limit ?? 24);

  if (opts.creatorId) query = query.eq("creator_id", opts.creatorId);
  if (opts.priceFilter === "free") query = query.eq("price_sol", 0);
  if (opts.priceFilter === "paid") query = query.gt("price_sol", 0);

  if (opts.orderBy === "top") {
    query = query.order("avg_rating", { ascending: false, nullsFirst: false });
  } else if (opts.orderBy === "trending") {
    query = query.order("purchase_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (opts.categorySlug) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
    else return [];
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((p) => {
    const imgs = (p.images ?? []) as { image_url: string; position: number }[];
    imgs.sort((a, b) => a.position - b.position);
    const creator = Array.isArray(p.creator) ? p.creator[0] : p.creator;
    return {
      id: p.id,
      title: p.title,
      price_sol: Number(p.price_sol),
      avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
      rating_count: p.rating_count,
      cover_image: imgs[0]?.image_url ?? null,
      creator_username: creator?.username ?? "unknown",
    };
  });
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
      images:prompt_images ( id, image_url, position ),
      category:categories ( id, name, slug ),
      platforms:prompt_platforms ( platforms ( id, name, slug ) )
    `
    )
    .eq("id", promptId)
    .maybeSingle();

  if (!prompt || prompt.status !== "active") return null;

  let hasAccess = false;
  if (prompt.price_sol === 0) {
    hasAccess = Boolean(viewerUserId);
  } else if (viewerUserId) {
    if (viewerUserId === prompt.creator_id) {
      hasAccess = true;
    } else {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("buyer_id", viewerUserId)
        .eq("prompt_id", promptId)
        .maybeSingle();
      hasAccess = Boolean(purchase);
    }
  }

  let myRating: number | null = null;
  if (viewerUserId) {
    const { data: r } = await supabase
      .from("ratings")
      .select("stars")
      .eq("rater_id", viewerUserId)
      .eq("prompt_id", promptId)
      .maybeSingle();
    myRating = r?.stars ?? null;
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
    isOwnPrompt: viewerUserId === prompt.creator_id,
  };
}
