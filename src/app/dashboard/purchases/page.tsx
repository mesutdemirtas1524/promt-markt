import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PromptCard, PromptMasonry, type PromptCardData } from "@/components/prompt-card";

export default async function MyPurchasesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { t } = await getServerT();

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("purchases")
    .select(
      `
      created_at,
      prompt:prompts!inner (
        id, title, price_sol, avg_rating, rating_count, favorite_count,
        creator:users!creator_id ( username ),
        images:prompt_images ( image_url, position )
      )
    `
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const cards: PromptCardData[] = (data ?? []).map((row) => {
    const p = Array.isArray(row.prompt) ? row.prompt[0] : row.prompt;
    const imgs = ((p?.images ?? []) as { image_url: string; position: number }[]).sort(
      (a, b) => a.position - b.position
    );
    const creator = Array.isArray(p?.creator) ? p?.creator[0] : p?.creator;
    return {
      id: p.id,
      title: p.title,
      price_sol: Number(p.price_sol),
      avg_rating: p.avg_rating === null ? null : Number(p.avg_rating),
      rating_count: p.rating_count,
      favorite_count: p.favorite_count ?? 0,
      cover_image: imgs[0]?.image_url ?? null,
      creator_username: creator?.username ?? "unknown",
    };
  });

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold tracking-tight">{t("dashboard.myLibrary")}</h2>
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {t("dashboard.empty.library")}
        </div>
      ) : (
        <PromptMasonry>
          {cards.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </PromptMasonry>
      )}
    </div>
  );
}
