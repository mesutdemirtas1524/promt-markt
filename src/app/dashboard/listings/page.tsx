import { getCurrentUser } from "@/lib/auth";
import { fetchPromptCards } from "@/lib/queries";
import { PromptCard } from "@/components/prompt-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const prompts = await fetchPromptCards({ creatorId: user.id, orderBy: "newest", limit: 50 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My listings</h2>
        <Link href="/upload">
          <Button>New prompt</Button>
        </Link>
      </div>
      {prompts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          You haven&apos;t uploaded any prompts yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {prompts.map((p) => (
            <div key={p.id} className="space-y-2">
              <PromptCard prompt={p} />
              <Link href={`/dashboard/listings/${p.id}/edit`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
