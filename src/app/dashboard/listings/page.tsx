import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { fetchPromptCards } from "@/lib/queries";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { t } = await getServerT();

  const prompts = await fetchPromptCards({
    creatorId: user.id,
    orderBy: "newest",
    limit: 50,
    includeRemoved: true,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("dashboard.myListings")}</h2>
        <Link href="/upload">
          <Button variant="primary">{t("dashboard.newPrompt")}</Button>
        </Link>
      </div>
      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {t("dashboard.empty.listings")}
        </div>
      ) : (
        <PromptMasonry>
          {prompts.map((p) => (
            <div key={p.id} className="mb-3 space-y-2 break-inside-avoid">
              <PromptCard prompt={p} />
              <Link href={`/dashboard/listings/${p.id}/edit`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("detail.edit")}
                </Button>
              </Link>
            </div>
          ))}
        </PromptMasonry>
      )}
    </div>
  );
}
