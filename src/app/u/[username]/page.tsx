import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards, fetchFavoritedPrompts } from "@/lib/queries";
import { getServerT } from "@/lib/i18n/server";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import { InfiniteFeed } from "@/components/infinite-feed";
import { shortAddress } from "@/lib/utils";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (!user) return { title: `@${username}` };
  const title = user.display_name ?? `@${user.username}`;
  const description = user.bio ?? `Prompts by @${user.username}`;
  return {
    title,
    description,
    openGraph: {
      title: `${title} on Promt Markt`,
      description,
      type: "profile",
      images: user.avatar_url ? [{ url: user.avatar_url, alt: title }] : undefined,
    },
    twitter: {
      card: user.avatar_url ? "summary" : "summary",
      title: `${title} on Promt Markt`,
      description,
      images: user.avatar_url ? [user.avatar_url] : undefined,
    },
  };
}

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

  const { t } = await getServerT();
  const PAGE_SIZE = 24;
  const [prompts, favorites] = await Promise.all([
    tab === "prompts"
      ? fetchPromptCards({ creatorId: user.id, orderBy: "newest", limit: PAGE_SIZE })
      : Promise.resolve([]),
    tab === "favorites" ? fetchFavoritedPrompts(user.id, 48) : Promise.resolve([]),
  ]);

  const items = tab === "favorites" ? favorites : prompts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Profile header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-border p-7 sm:p-9">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 0% 0%, rgba(167, 139, 250, 0.10), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-white/10">
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
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.display_name ?? `@${user.username}`}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{user.bio}</p>}
            {user.wallet_address && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-tint-1 px-2.5 py-1 font-mono text-[10.5px] tracking-tight text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {shortAddress(user.wallet_address, 6)}
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-border">
        <TabLink href={`/u/${user.username}`} active={tab === "prompts"}>
          {t("common.tabs.prompts")}
        </TabLink>
        <TabLink href={`/u/${user.username}?tab=favorites`} active={tab === "favorites"}>
          {t("common.tabs.favorites")}
        </TabLink>
      </nav>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          {tab === "favorites" ? t("common.empty.noFavorites") : t("common.empty.noPrompts")}
        </div>
      ) : tab === "prompts" ? (
        <InfiniteFeed
          initialItems={prompts}
          initialNextOffset={prompts.length}
          initialHasMore={prompts.length === PAGE_SIZE}
          filters={{ sort: "newest", creator: user.id }}
        />
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
        "relative px-4 py-2.5 text-sm tracking-tight transition-colors " +
        (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
      {active && <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />}
    </Link>
  );
}
