"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Ctx = { usd: number | null; loading: boolean };

const SolPriceContext = createContext<Ctx>({ usd: null, loading: false });

/**
 * Fetches the current SOL/USD price once at mount, then refreshes every 2 minutes.
 * Uses our cached /api/sol-price endpoint (which itself caches CoinGecko for 60s),
 * so real CoinGecko calls happen at most ~30 times per hour regardless of traffic.
 */
export function SolPriceProvider({ children }: { children: React.ReactNode }) {
  const [usd, setUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/sol-price");
        if (!res.ok) throw new Error("price fetch failed");
        const data = (await res.json()) as { usd: number | null };
        if (!cancelled && typeof data.usd === "number") setUsd(data.usd);
      } catch {
        // Silent — we just don't show USD if unavailable.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const iv = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return <SolPriceContext.Provider value={{ usd, loading }}>{children}</SolPriceContext.Provider>;
}

export function useSolPrice() {
  return useContext(SolPriceContext);
}

/** Format a SOL amount as "$X.YZ" or empty string if price unavailable. */
export function solToUsdString(sol: number, usd: number | null): string {
  if (!usd || !(sol > 0)) return "";
  const value = sol * usd;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString()}`;
}
