import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { fetchFavoritedPrompts } from "@/lib/queries";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";

export default async function MyFavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { t } = await getServerT();

  const prompts = await fetchFavoritedPrompts(user.id, 60);
  const favoriteIds = new Set(prompts.map((p) => p.id));

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold tracking-tight">{t("dashboard.myFavorites")}</h2>
      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {t("dashboard.empty.favorites")}
        </div>
      ) : (
        <PromptMasonry>
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </PromptMasonry>
      )}
    </div>
  );
}
