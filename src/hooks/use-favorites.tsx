"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type Ctx = {
  /** True if the current user has favorited this prompt. False until hydrated. */
  isFavorited: (promptId: string) => boolean;
  /** Mark a prompt as favorited locally (call after a successful toggle). */
  markFavorited: (promptId: string) => void;
  /** Mark a prompt as unfavorited locally. */
  markUnfavorited: (promptId: string) => void;
  /** True once we've loaded the user's set (or know they're not signed in). */
  ready: boolean;
};

const FavoritesContext = createContext<Ctx>({
  isFavorited: () => false,
  markFavorited: () => {},
  markUnfavorited: () => {},
  ready: false,
});

/**
 * Loads the current user's favorited prompt IDs once on mount and exposes
 * them via context. Pages can then be statically served (no per-user data
 * during SSR), and the heart state hydrates on the client after auth.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
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
        const res = await fetch("/api/user/favorites/ids", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("favorites fetch failed");
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

  const isFavorited = useCallback((promptId: string) => ids.has(promptId), [ids]);

  const markFavorited = useCallback((promptId: string) => {
    setIds((prev) => {
      if (prev.has(promptId)) return prev;
      const next = new Set(prev);
      next.add(promptId);
      return next;
    });
  }, []);

  const markUnfavorited = useCallback((promptId: string) => {
    setIds((prev) => {
      if (!prev.has(promptId)) return prev;
      const next = new Set(prev);
      next.delete(promptId);
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ isFavorited, markFavorited, markUnfavorited, ready }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
