import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards, fetchUserFavoriteIds, fetchFavoritedPrompts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PromptCard } from "@/components/prompt-card";
import { shortAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { tab?: string };

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "favorites" ? "favorites" : "prompts";

  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username, display_name, bio, avatar_url, wallet_address, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!user) notFound();

  const viewer = await getCurrentUser();
  const [prompts, favorites, favoriteIds] = await Promise.all([
    tab === "prompts"
      ? fetchPromptCards({ creatorId: user.id, orderBy: "newest", limit: 48 })
      : Promise.resolve([]),
    tab === "favorites" ? fetchFavoritedPrompts(user.id, 48) : Promise.resolve([]),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  const items = tab === "favorites" ? favorites : prompts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted">
          {user.avatar_url && (
            <Image
              src={user.avatar_url}
              alt={user.display_name ?? user.username}
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>
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

      <nav className="mb-6 flex gap-1 border-b border-border">
        <TabLink href={`/u/${user.username}`} active={tab === "prompts"}>
          Prompts
        </TabLink>
        <TabLink href={`/u/${user.username}?tab=favorites`} active={tab === "favorites"}>
          Favorites
        </TabLink>
      </nav>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {tab === "favorites" ? "No favorites yet." : "No prompts yet."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "border-b-2 px-4 py-2 text-sm transition-colors " +
        (active
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}
