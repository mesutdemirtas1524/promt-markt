import { getCurrentUser } from "@/lib/auth";
import { fetchFavoritedPrompts } from "@/lib/queries";
import { PromptCard } from "@/components/prompt-card";

export default async function MyFavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const prompts = await fetchFavoritedPrompts(user.id, 60);
  const favoriteIds = new Set(prompts.map((p) => p.id));

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">My favorites</h2>
      {prompts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          You haven&apos;t favorited any prompts yet. Tap the heart on any prompt to save it here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
