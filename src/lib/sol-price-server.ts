import "server-only";

/**
 * Server-side SOL/USD price fetch. Hits CoinGecko directly — Next caches
 * the response for 60s via `next.revalidate`, so concurrent server calls
 * collapse to one upstream request per minute. Returns null on failure;
 * callers must handle that path (e.g., reject checkout) so we never
 * compute lamports from a stale or absent price.
 */
let cached: { usd: number; at: number } | null = null;
const TTL_MS = 60_000;

export async function fetchSolUsdPriceServer(): Promise<number | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.usd;

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { solana?: { usd?: number } };
    const usd = data.solana?.usd;
    if (typeof usd !== "number" || usd <= 0) return null;
    cached = { usd, at: Date.now() };
    return usd;
  } catch {
    return null;
  }
}

/** Convert a USD amount to lamports at the current SOL price. */
export function usdToLamports(usdAmount: number, solUsdPrice: number): number {
  if (solUsdPrice <= 0) return 0;
  const sol = usdAmount / solUsdPrice;
  return Math.round(sol * 1_000_000_000);
}

/** Convert a USD amount to a SOL number at the current SOL price. */
export function usdToSol(usdAmount: number, solUsdPrice: number): number {
  if (solUsdPrice <= 0) return 0;
  return usdAmount / solUsdPrice;
}
