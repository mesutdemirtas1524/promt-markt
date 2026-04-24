import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PromptCard, type PromptCardData } from "@/components/prompt-card";

export default async function MyPurchasesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("purchases")
    .select(
      `
      created_at,
      prompt:prompts!inner (
        id, title, price_sol, avg_rating, rating_count,
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
      cover_image: imgs[0]?.image_url ?? null,
      creator_username: creator?.username ?? "unknown",
    };
  });

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">My library</h2>
      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Prompts you purchase or unlock will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cards.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}
