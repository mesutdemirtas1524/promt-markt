"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { User } from "@/lib/supabase/types";

/**
 * When Privy authenticates a user, ensure a matching row exists in our `users` table.
 * Returns the DB user row (or null while loading / logged out).
 */
export function useSyncUser() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user) {
      setDbUser(null);
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) return;

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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ wallet_address: walletAddress, email }),
        });
        if (!res.ok) throw new Error(`sync failed: ${res.status}`);
        const data = (await res.json()) as { user: User };
        if (!cancelled) {
          setDbUser(data.user);
          syncedFor.current = user.id;
        }
      } catch (err) {
        console.error("useSyncUser", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user, getAccessToken]);

  return { dbUser, loading };
}
