import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import { CREATOR_SHARE_BPS } from "@/lib/constants";
import { PriceTag } from "@/components/price-tag";

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

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.price_paid_sol ?? 0), 0);
  const earned = (total * CREATOR_SHARE_BPS) / 10_000;

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Earnings</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Box label="Total sales" value={rows.length.toString()} />
        <Box label="Volume" value={<PriceTag sol={total} size="base" />} />
        <Box label="Your earnings (80%)" value={<PriceTag sol={earned} size="base" />} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No sales yet. Earnings land directly in your wallet when someone buys.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Prompt</th>
                <th className="px-4 py-2 text-left">Buyer</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">You got (80%)</th>
                <th className="px-4 py-2 text-right">When</th>
                <th className="px-4 py-2 text-right">Tx</th>
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
                    <td className="px-4 py-2 text-right">
                      <PriceTag sol={price} size="xs" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <PriceTag sol={(price * CREATOR_SHARE_BPS) / 10_000} size="xs" />
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                    <td className="px-4 py-2 text-right">
                      {r.tx_signature ? (
                        <a
                          href={`https://solscan.io/tx/${r.tx_signature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs hover:underline"
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
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
