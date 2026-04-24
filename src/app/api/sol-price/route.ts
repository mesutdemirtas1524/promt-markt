import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Cache the upstream response for 60 seconds — CoinGecko free tier ~30 req/min.
export const revalidate = 60;

type CoinGeckoResponse = { solana?: { usd?: number } };

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as CoinGeckoResponse;
    const usd = data.solana?.usd;
    if (typeof usd !== "number") throw new Error("missing price");
    return NextResponse.json(
      { usd, source: "coingecko", updatedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, usd: null }, { status: 502 });
  }
}
