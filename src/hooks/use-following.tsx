"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type Ctx = {
  isFollowing: (userId: string) => boolean;
  markFollowing: (userId: string) => void;
  markUnfollowing: (userId: string) => void;
  ready: boolean;
};

const FollowingContext = createContext<Ctx>({
  isFollowing: () => false,
  markFollowing: () => {},
  markUnfollowing: () => {},
  ready: false,
});

/**
 * Tracks the set of user IDs that the signed-in viewer follows.
 * Same pattern as FavoritesProvider — fetched once on mount, exposes
 * optimistic mark/unmark for FollowButton to use.
 */
export function FollowingProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, authenticated, getAccessToken } = usePrivy();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!authenticated) {
      setIds(new Set());
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/user/following/ids", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("following fetch failed");
        const data = (await res.json()) as { ids: string[] };
        if (!cancelled) setIds(new Set(data.ids));
      } catch {
        if (!cancelled) setIds(new Set());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, authenticated, getAccessToken]);

  const isFollowing = useCallback((userId: string) => ids.has(userId), [ids]);

  const markFollowing = useCallback((userId: string) => {
    setIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }, []);

  const markUnfollowing = useCallback((userId: string) => {
    setIds((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  return (
    <FollowingContext.Provider value={{ isFollowing, markFollowing, markUnfollowing, ready }}>
      {children}
    </FollowingContext.Provider>
  );
}

export function useFollowing() {
  return useContext(FollowingContext);
}
