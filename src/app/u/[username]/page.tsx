import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards } from "@/lib/queries";
import { PromptCard } from "@/components/prompt-card";
import { shortAddress } from "@/lib/utils";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username, display_name, bio, avatar_url, wallet_address, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!user) notFound();

  const prompts = await fetchPromptCards({ creatorId: user.id, orderBy: "newest", limit: 48 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 rounded-full bg-muted" />
        <div>
          <h1 className="text-2xl font-bold">{user.display_name ?? `@${user.username}`}</h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          {user.bio && <p className="mt-2 max-w-2xl text-sm">{user.bio}</p>}
          {user.wallet_address && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {shortAddress(user.wallet_address, 6)}
            </p>
          )}
        </div>
      </div>
      <h2 className="mb-4 text-lg font-semibold">Prompts</h2>
      {prompts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No prompts yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}
