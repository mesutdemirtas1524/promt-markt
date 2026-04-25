"use client";

import { useEffect, useState } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants";

/**
 * Fetches the SOL balance for `address` and refreshes every 30 seconds.
 * Returns null while loading or if address is missing/invalid.
 */
export function useSolBalance(address: string | null | undefined): number | null {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    async function load() {
      try {
        const lamports = await connection.getBalance(new PublicKey(address!));
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    }

    load();
    const iv = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [address]);

  return balance;
}
