"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { User } from "@/lib/supabase/types";

type Ctx = {
  dbUser: User | null;
  loading: boolean;
  /** Resolves once dbUser is available, or null after timeoutMs. */
  waitForUser: (timeoutMs?: number) => Promise<User | null>;
};

const UserContext = createContext<Ctx>({
  dbUser: null,
  loading: false,
  waitForUser: async () => null,
});

/**
 * Mount once at app root. Keeps our DB user row in sync with the Privy user,
 * and exposes `waitForUser` so components can await it when they need it
 * immediately after a user action.
 */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const attemptRef = useRef<string | null>(null);
  const dbUserRef = useRef<User | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    dbUserRef.current = dbUser;
  }, [dbUser]);

  useEffect(() => {
    if (!ready || !authenticated || !user) {
      setDbUser(null);
      attemptRef.current = null;
      return;
    }
    const attemptId = `${user.id}:${retryKey}`;
    if (attemptRef.current === attemptId) return;
    attemptRef.current = attemptId;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("no token");

        const solanaWallet = user.linkedAccounts?.find(
          (a) => a.type === "wallet" && "chainType" in a && a.chainType === "solana"
        );
        const walletAddress =
          solanaWallet && "address" in solanaWallet ? (solanaWallet.address as string) : null;

        const email =
          user.email?.address ??
          user.google?.email ??
          (user.linkedAccounts?.find((a) => a.type === "email") as { address?: string } | undefined)?.address ??
          null;

        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ wallet_address: walletAddress, email }),
        });
        if (!res.ok) throw new Error(`sync failed: ${res.status}`);
        const data = (await res.json()) as { user: User };
        if (!cancelled) setDbUser(data.user);
      } catch (err) {
        console.error("CurrentUserProvider", err);
        if (!cancelled && retryKey < 4) {
          const delay = 800 * Math.pow(2, retryKey);
          setTimeout(() => {
            if (!cancelled) setRetryKey((k) => k + 1);
          }, delay);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user, getAccessToken, retryKey]);

  async function waitForUser(timeoutMs = 10_000): Promise<User | null> {
    if (dbUserRef.current) return dbUserRef.current;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (dbUserRef.current) return dbUserRef.current;
      await new Promise((r) => setTimeout(r, 200));
    }
    return dbUserRef.current;
  }

  return (
    <UserContext.Provider value={{ dbUser, loading, waitForUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
