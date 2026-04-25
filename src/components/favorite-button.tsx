"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  promptId: string;
  initiallyFavorited: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
  initialCount?: number;
  onCountChange?: (next: number) => void;
};

export function FavoriteButton({
  promptId,
  initiallyFavorited,
  size = "md",
  showLabel = false,
  initialCount,
  onCountChange,
}: Props) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const [favorited, setFavorited] = useState(initiallyFavorited);
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
    setFavorited(optimistic);
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
      setFavorited(wasFavorited);
      setCount(count);
      onCountChange?.(count);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const padClass = size === "sm" ? "h-7 w-7" : "h-9 px-3";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-background",
        showLabel ? "px-3 text-sm" : "",
        padClass,
        favorited ? "text-pink-500" : "text-foreground"
      )}
      disabled={busy}
    >
      <Heart className={cn(iconClass, favorited && "fill-current")} />
      {showLabel && (favorited ? "Favorited" : "Favorite")}
      {showLabel && initialCount !== undefined && (
        <span className="text-xs opacity-70">· {count}</span>
      )}
    </button>
  );
}
