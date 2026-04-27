"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { useFavorites } from "@/hooks/use-favorites";

type Props = {
  promptId: string;
  size?: "sm" | "md";
  /**
   * Visual variant. `icon` = round heart over images; `label` = full-width
   * pill button; `stat` = a stat-tile shaped button so the favorite count
   * and the favorite toggle can share a single control.
   */
  variant?: "icon" | "label" | "stat";
  /** @deprecated use variant="label" */
  showLabel?: boolean;
  initialCount?: number;
  onCountChange?: (next: number) => void;
};

export function FavoriteButton({
  promptId,
  size = "md",
  variant,
  showLabel = false,
  initialCount,
  onCountChange,
}: Props) {
  const resolvedVariant: "icon" | "label" | "stat" =
    variant ?? (showLabel ? "label" : "icon");
  const { authenticated, login, getAccessToken } = usePrivy();
  const { t } = useT();
  const { isFavorited, markFavorited, markUnfavorited } = useFavorites();
  const favorited = isFavorited(promptId);
  const [count, setCount] = useState(initialCount ?? 0);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) {
      login();
      return;
    }
    if (busy) return;
    setBusy(true);

    const wasFavorited = favorited;
    const optimistic = !wasFavorited;
    if (optimistic) markFavorited(promptId);
    else markUnfavorited(promptId);
    const optimisticCount = count + (optimistic ? 1 : -1);
    setCount(optimisticCount);
    onCountChange?.(optimisticCount);

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/prompts/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: promptId, action: optimistic ? "add" : "remove" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    } catch (err) {
      // Revert
      if (wasFavorited) markFavorited(promptId);
      else markUnfavorited(promptId);
      setCount(count);
      onCountChange?.(count);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (resolvedVariant === "label") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={favorited ? t("fav.remove") : t("fav.add")}
        disabled={busy}
        className={cn(
          "group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-tint-1 px-4 text-sm font-medium tracking-tight transition-all duration-200 hover:bg-tint-2 active:scale-[0.98]",
          favorited && "border-pink-400/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/15"
        )}
      >
        <Heart className={cn("h-4 w-4 transition-transform group-hover:scale-110", favorited && "fill-current")} />
        {favorited ? t("fav.favorited") : t("fav.favorite")}
        <span className="text-xs tabular-nums opacity-60">· {count}</span>
      </button>
    );
  }

  if (resolvedVariant === "stat") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={favorited ? t("fav.remove") : t("fav.add")}
        disabled={busy}
        className={cn(
          "group rounded-xl border bg-tint-1 px-3 py-2.5 text-left transition-all hover:bg-tint-2 active:scale-[0.98]",
          favorited
            ? "border-pink-400/30 bg-pink-500/10 hover:bg-pink-500/15"
            : "border-border"
        )}
      >
        <div
          className={cn(
            "mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider",
            favorited ? "text-pink-300" : "text-muted-foreground"
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-transform group-hover:scale-110",
              favorited ? "fill-current text-pink-400" : "text-pink-400"
            )}
          />
          {t("detail.stat.favorites")}
        </div>
        <div
          className={cn(
            "truncate text-sm font-semibold tabular-nums",
            favorited && "text-pink-200"
          )}
        >
          {count}
        </div>
      </button>
    );
  }

  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? t("fav.remove") : t("fav.add")}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/55 backdrop-blur transition-all duration-200 hover:scale-110",
        dim,
        favorited ? "text-pink-400" : "text-white/85 hover:text-white"
      )}
    >
      <Heart className={cn(icon, favorited && "fill-current")} />
    </button>
  );
}
