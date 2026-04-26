"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Bell, Heart, UserPlus, ShoppingBag, Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatSol } from "@/lib/utils";
import { SolLogo } from "./sol-logo";

type Actor = { username: string; display_name: string | null; avatar_url: string | null } | null;
type Prompt = { id: string; title: string } | null;
type Notification = {
  id: string;
  kind: "favorite" | "follow" | "purchase" | "tip";
  created_at: string;
  read_at: string | null;
  amount_sol: number | null;
  message: string | null;
  actor: Actor;
  prompt: Prompt;
};

const POLL_MS = 60_000; // refresh badge once a minute

export function NotificationsBell() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const refresh = useCallback(
    async (markAll = false) => {
      if (!authenticated) {
        setItems([]);
        setUnread(0);
        return;
      }
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/notifications?limit=15", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { items: Notification[]; unreadCount: number };
        setItems(data.items);
        setUnread(data.unreadCount);
        if (markAll && data.unreadCount > 0) {
          await fetch("/api/user/notifications/read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ all: true }),
          });
          // Optimistically clear the badge; the items array still shows the
          // un-faded list until next refresh
          setUnread(0);
        }
      } catch {
        /* silent */
      }
    },
    [authenticated, getAccessToken]
  );

  // Fetch on mount + every minute
  useEffect(() => {
    if (!ready) return;
    refresh();
    const iv = setInterval(refresh, POLL_MS);
    return () => clearInterval(iv);
  }, [ready, refresh]);

  // When opened, mark everything visible as read
  useEffect(() => {
    if (open) {
      setLoading(true);
      refresh(true).finally(() => setLoading(false));
    }
  }, [open, refresh]);

  // Position the dropdown under the trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, [open]);

  // Click-outside / escape to close
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !authenticated) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {mounted && open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
            className="w-80 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-tint-1 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </span>
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="text-[11px] text-violet-300 hover:underline"
              >
                See all
              </Link>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Nothing yet — favorites, follows, sales and tips show up here.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => (
                    <NotificationRow key={n.id} n={n} onClick={() => setOpen(false)} />
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function NotificationRow({
  n,
  onClick,
}: {
  n: Notification;
  onClick?: () => void;
}) {
  const actorName = n.actor?.display_name ?? `@${n.actor?.username ?? "someone"}`;
  const href = n.prompt?.id
    ? `/prompt/${n.prompt.id}`
    : n.actor?.username
    ? `/u/${n.actor.username}`
    : "/dashboard/notifications";

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
          {n.message && <span className="block text-muted-foreground">&ldquo;{n.message}&rdquo;</span>}
        </>
      );
      break;
  }

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-tint-2",
          !n.read_at && "bg-violet-500/[0.04]"
        )}
      >
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-tint-2 ring-1 ring-border">
          {n.actor?.avatar_url ? (
            <Image src={n.actor.avatar_url} alt="" fill sizes="32px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              {(n.actor?.username ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card ring-1 ring-border">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
          <div>{body}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground/70">
            {formatRelativeTime(n.created_at)}
          </div>
        </div>
        {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />}
      </Link>
    </li>
  );
}
