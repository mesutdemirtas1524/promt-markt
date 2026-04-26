import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { CREATOR_SHARE_BPS } from "@/lib/constants";
import { PriceTag } from "@/components/price-tag";
import { SalesChart, bucketDailySales } from "@/components/sales-chart";
import { TimeAgo } from "@/components/time-ago";

export const dynamic = "force-dynamic";

type PurchaseRow = {
  id: string;
  created_at: string;
  price_paid_sol: number | string | null;
  tx_signature: string | null;
  prompts: { id: string; title: string; creator_id: string } | { id: string; title: string; creator_id: string }[] | null;
  buyer: { username: string } | { username: string }[] | null;
};

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("purchases")
    .select(
      `
      id, created_at, price_paid_sol, tx_signature,
      prompts!inner ( id, title, creator_id ),
      buyer:users!buyer_id ( username )
    `
    )
    .eq("prompts.creator_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as PurchaseRow[];
  const total = rows.reduce((s, r) => s + Number(r.price_paid_sol ?? 0), 0);
  const earned = (total * CREATOR_SHARE_BPS) / 10_000;

  const dailySales = bucketDailySales(
    rows.map((r) => ({ created_at: r.created_at, price_paid_sol: r.price_paid_sol })),
    30
  );

  // Pull view counts for every active prompt by this creator so we can
  // compute conversion rate alongside revenue.
  const { data: myPrompts } = await supabase
    .from("prompts")
    .select("id, title, view_count, purchase_count")
    .eq("creator_id", user.id)
    .eq("status", "active");
  const totalViews = (myPrompts ?? []).reduce(
    (s, p) => s + Number((p as { view_count?: number }).view_count ?? 0),
    0
  );

  const promptStats = new Map<
    string,
    { id: string; title: string; sales: number; volumeSol: number; views: number }
  >();
  for (const p of myPrompts ?? []) {
    const row = p as { id: string; title: string; view_count?: number };
    promptStats.set(row.id, {
      id: row.id,
      title: row.title,
      sales: 0,
      volumeSol: 0,
      views: Number(row.view_count ?? 0),
    });
  }
  for (const r of rows) {
    const p = Array.isArray(r.prompts) ? r.prompts[0] : r.prompts;
    if (!p) continue;
    const existing =
      promptStats.get(p.id) ?? { id: p.id, title: p.title, sales: 0, volumeSol: 0, views: 0 };
    existing.sales += 1;
    existing.volumeSol += Number(r.price_paid_sol ?? 0);
    promptStats.set(p.id, existing);
  }
  const topPrompts = Array.from(promptStats.values())
    .sort((a, b) => b.volumeSol - a.volumeSol)
    .slice(0, 5);

  // Tip income (separate from sales)
  const { data: tipsData } = await supabase
    .from("tips")
    .select("amount_sol, created_at")
    .eq("creator_id", user.id);
  const tipsTotal = (tipsData ?? []).reduce((s, t) => s + Number(t.amount_sol ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Earnings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your sales activity. Every payment lands in your wallet on-chain — this is just a
          receipt and analytics view.
        </p>
      </div>

      {/* Top stat strip */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total sales" value={String(rows.length)} />
        <Stat label="Earned (80%)" value={<PriceTag sol={earned} size="base" />} />
        <Stat label="Tips received" value={<PriceTag sol={tipsTotal} size="base" />} />
        <Stat label="Views" value={totalViews.toLocaleString()} />
        <Stat
          label="Conversion"
          value={
            totalViews === 0
              ? "—"
              : `${((rows.length / totalViews) * 100).toFixed(rows.length / totalViews < 0.01 ? 2 : 1)}%`
          }
        />
      </div>

      {/* Sales over time */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SalesChart data={dailySales} metric="count" />
        <SalesChart data={dailySales} metric="volume" />
      </div>

      {/* Top prompts */}
      {topPrompts.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Top prompts</h3>
            <p className="text-[11px] text-muted-foreground">By revenue across all time.</p>
          </div>
          <ul className="divide-y divide-border">
            {topPrompts.map((p, i) => {
              const max = topPrompts[0].volumeSol;
              const w = max === 0 ? 0 : (p.volumeSol / max) * 100;
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                        #{i + 1}
                      </span>
                      <Link
                        href={`/prompt/${p.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {p.title}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">{p.views} views</span>
                      <span className="tabular-nums">{p.sales} sales</span>
                      <span className="tabular-nums">
                        {p.views > 0 ? `${((p.sales / p.views) * 100).toFixed(1)}%` : "—"}
                      </span>
                      <span className="tabular-nums text-foreground">
                        <PriceTag sol={(p.volumeSol * CREATOR_SHARE_BPS) / 10_000} size="xs" />
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-tint-2">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sales table */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center text-sm text-muted-foreground">
          No sales yet. Earnings land directly in your wallet when someone buys.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">All sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tint-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Prompt</th>
                  <th className="px-4 py-2 text-left font-medium">Buyer</th>
                  <th className="px-4 py-2 text-right font-medium">Price</th>
                  <th className="px-4 py-2 text-right font-medium">You got</th>
                  <th className="px-4 py-2 text-right font-medium">When</th>
                  <th className="px-4 py-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const prompt = Array.isArray(r.prompts) ? r.prompts[0] : r.prompts;
                  const buyer = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer;
                  const price = Number(r.price_paid_sol ?? 0);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <Link href={`/prompt/${prompt?.id}`} className="hover:underline">
                          {prompt?.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">@{buyer?.username}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <PriceTag sol={price} size="xs" />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        <PriceTag sol={(price * CREATOR_SHARE_BPS) / 10_000} size="xs" />
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        <TimeAgo iso={r.created_at} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {r.tx_signature ? (
                          <a
                            href={`https://solscan.io/tx/${r.tx_signature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-violet-300 hover:underline"
                          >
                            ↗
                          </a>
                        ) : (
                          <span className="text-muted-foreground">free</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
