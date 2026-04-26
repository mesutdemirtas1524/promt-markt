"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFollowing } from "@/hooks/use-following";

type Props = {
  /** The user to follow / unfollow. */
  targetUserId: string;
  targetUsername: string;
  /** Optional: hide entirely if this is the viewer's own account. */
  hideForSelfId?: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function FollowButton({
  targetUserId,
  targetUsername,
  hideForSelfId,
  size = "md",
  className,
}: Props) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { isFollowing, markFollowing, markUnfollowing } = useFollowing();
  const following = isFollowing(targetUserId);
  const [busy, setBusy] = useState(false);

  if (hideForSelfId && hideForSelfId === targetUserId) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) {
      login();
      return;
    }
    if (busy) return;
    setBusy(true);

    const wasFollowing = following;
    const optimistic = !wasFollowing;
    if (optimistic) markFollowing(targetUserId);
    else markUnfollowing(targetUserId);

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          target_username: targetUsername,
          action: optimistic ? "follow" : "unfollow",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    } catch (err) {
      // Revert
      if (wasFollowing) markFollowing(targetUserId);
      else markUnfollowing(targetUserId);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sizeClass = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight transition-all duration-200 active:scale-[0.97]",
        sizeClass,
        following
          ? "border-border bg-tint-2 text-foreground hover:bg-tint-3"
          : "border-violet-400/30 bg-violet-500/15 text-violet-300 hover:bg-violet-500/20",
        className
      )}
    >
      {following ? (
        <>
          <UserCheck className="h-3.5 w-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </button>
  );
}
