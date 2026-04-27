"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import { useCurrentUser } from "./use-current-user";

/**
 * When the user switches the active account inside their Solana wallet
 * extension (Phantom, Backpack, …), the connected address no longer matches
 * the address Privy authenticated us against. Treat that as a session change:
 * log out and prompt the user to sign in again with the new account.
 *
 * We only act once both Privy and the wallets list are ready, and only when
 * the logged-in wallet address is genuinely missing from the connected set
 * — not just before the wallet adapter has had a chance to populate.
 */
export function WalletAccountWatcher() {
  const { ready: privyReady, authenticated, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { dbUser } = useCurrentUser();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!privyReady || !authenticated || !walletsReady) return;
    if (!dbUser?.wallet_address) return;

    // No connected external wallets means the user is on an embedded /
    // social-login session — nothing to watch.
    if (wallets.length === 0) return;

    const expected = dbUser.wallet_address.toLowerCase();
    const stillConnected = wallets.some((w) => w.address.toLowerCase() === expected);
    if (stillConnected) {
      firedRef.current = false;
      return;
    }

    if (firedRef.current) return;
    firedRef.current = true;

    toast.info("Wallet account changed — signing you out", {
      description: "Sign in again with the new account to continue.",
    });
    void logout();
  }, [privyReady, authenticated, walletsReady, wallets, dbUser?.wallet_address, logout]);

  return null;
}
