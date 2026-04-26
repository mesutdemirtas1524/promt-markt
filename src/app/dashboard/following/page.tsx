import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards } from "@/lib/queries";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import Link from "next/link";
import { Compass } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * "Following" feed: newest prompts from creators the viewer follows.
 */
export default async function FollowingFeedPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();

  // Who do I follow?
  const { data: edges } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (edges ?? []).map((e) => e.following_id as string);

  if (followingIds.length === 0) {
    return (
      <div>
        <h2 className="mb-6 text-lg font-semibold tracking-tight">Following</h2>
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center">
          <Compass className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            You&apos;re not following anyone yet.
          </p>
          <Link
            href="/creators"
            className="mt-4 inline-block text-sm text-violet-300 hover:underline"
          >
            Discover creators →
          </Link>
        </div>
      </div>
    );
  }

  // Fetch latest prompts across all followed creators.
  // Reuses fetchPromptCards but limited to followingIds via in() — quick
  // and dirty; revisit if a user follows hundreds of creators.
  const { data } = await supabase
    .from("prompts")
    .select(
      `
      id, title, price_usd, price_sol, avg_rating, rating_count, created_at, category_id, purchase_count, favorite_count, status,
      creator:users!creator_id ( username, avatar_url ),
      images:prompt_images ( image_url, position, width, height )
    `
    )
    .in("creator_id", followingIds)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  const items = (data ?? []).map((p) => {
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
      cover_image: cover?.image_url ?? null,
      cover_width: cover?.width ?? null,
      cover_height: cover?.height ?? null,
      creator_username: creator?.username ?? "unknown",
      creator_avatar_url: (creator as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    };
  });

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold tracking-tight">Following</h2>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center text-sm text-muted-foreground">
          The creators you follow haven&apos;t posted anything yet.
        </div>
      ) : (
        <PromptMasonry>
          {items.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </PromptMasonry>
      )}
    </div>
  );
}

// Use fetchPromptCards-style data, but PromptCard expects a particular
// shape — this page builds it inline because we filter by `creator_id IN
// (...)` which fetchPromptCards doesn't currently support.
// (creator name on cards still works via the embedded select above.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeHint = fetchPromptCards;
