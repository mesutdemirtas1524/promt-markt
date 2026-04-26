import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Heart, UserPlus, ShoppingBag, Coins, Bell } from "lucide-react";
import { formatSol } from "@/lib/utils";
import { SolLogo } from "@/components/sol-logo";
import { TimeAgo } from "@/components/time-ago";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: "favorite" | "follow" | "purchase" | "tip";
  created_at: string;
  read_at: string | null;
  amount_sol: number | null;
  message: string | null;
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null;
  prompt: { id: string; title: string } | null;
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();

  // Mark everything read on view (server-side, so the bell badge clears
  // even on a hard navigation).
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const { data } = await supabase
    .from("notifications")
    .select(
      `
      id, kind, created_at, read_at, amount_sol, message,
      actor:users!actor_id ( username, display_name, avatar_url ),
      prompt:prompts!prompt_id ( id, title )
    `
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: Row[] = (data ?? []).map((n) => {
    const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
    const prompt = Array.isArray(n.prompt) ? n.prompt[0] : n.prompt;
    return {
      id: n.id,
      kind: n.kind as Row["kind"],
      created_at: n.created_at,
      read_at: n.read_at,
      amount_sol: n.amount_sol,
      message: n.message,
      actor: actor
        ? {
            username: actor.username,
            display_name: actor.display_name,
            avatar_url: actor.avatar_url,
          }
        : null,
      prompt: prompt ? { id: prompt.id, title: prompt.title } : null,
    };
  });

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold tracking-tight">Notifications</h2>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Nothing yet. Favorites, follows, sales and tips appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((n) => (
            <Row key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ n }: { n: Row }) {
  const actorName = n.actor?.display_name ?? `@${n.actor?.username ?? "someone"}`;
  const href = n.prompt?.id
    ? `/prompt/${n.prompt.id}`
    : n.actor?.username
    ? `/u/${n.actor.username}`
    : "#";

  let icon: React.ReactNode = null;
  let body: React.ReactNode = null;

  switch (n.kind) {
    case "favorite":
      icon = <Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />;
      body = (
        <>
          <strong className="text-foreground">{actorName}</strong> favorited{" "}
          <span className="text-foreground">{n.prompt?.title ?? "your prompt"}</span>
        </>
      );
      break;
    case "follow":
      icon = <UserPlus className="h-3.5 w-3.5 text-violet-300" />;
      body = (
        <>
          <strong className="text-foreground">{actorName}</strong> started following you
        </>
      );
      break;
    case "purchase":
      icon = <ShoppingBag className="h-3.5 w-3.5 text-emerald-300" />;
      body = (
        <>
          <strong className="text-foreground">{actorName}</strong> bought{" "}
          <span className="text-foreground">{n.prompt?.title ?? "your prompt"}</span> for{" "}
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-emerald-300">
            <SolLogo className="h-3 w-3" />
            {formatSol(Number(n.amount_sol ?? 0))} SOL
          </span>
        </>
      );
      break;
    case "tip":
      icon = <Coins className="h-3.5 w-3.5 text-amber-300" />;
      body = (
        <>
          <strong className="text-foreground">{actorName}</strong> tipped{" "}
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-amber-300">
            <SolLogo className="h-3 w-3" />
            {formatSol(Number(n.amount_sol ?? 0))} SOL
          </span>
          {n.message && (
            <span className="block text-muted-foreground">&ldquo;{n.message}&rdquo;</span>
          )}
        </>
      );
      break;
  }

  return (
    <li>
      <Link href={href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-tint-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-tint-2 ring-1 ring-border">
          {n.actor?.avatar_url ? (
            <Image src={n.actor.avatar_url} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {(n.actor?.username ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card ring-1 ring-border">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
          <div>{body}</div>
          <div className="mt-1 text-[11px] text-muted-foreground/70">
            <TimeAgo iso={n.created_at} />
          </div>
        </div>
      </Link>
    </li>
  );
}
