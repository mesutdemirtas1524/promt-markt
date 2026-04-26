import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceTag } from "@/components/price-tag";
import { WalletRecovery } from "@/components/wallet-recovery";
import { SalesChart, bucketDailySales } from "@/components/sales-chart";
import { CREATOR_SHARE_BPS } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();

  const [
    { count: listings },
    { count: purchased },
    { data: sales },
    { data: recentSales },
  ] = await Promise.all([
    supabase.from("prompts").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
    supabase
      .from("purchases")
      .select("price_paid_sol, prompts!inner(creator_id)")
      .eq("prompts.creator_id", user.id),
    supabase
      .from("purchases")
      .select("created_at, price_paid_sol, prompts!inner(creator_id)")
      .eq("prompts.creator_id", user.id)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  const totalSales = (sales ?? []).reduce((sum, p) => sum + Number(p.price_paid_sol ?? 0), 0);
  const earned = (totalSales * CREATOR_SHARE_BPS) / 10_000;

  const dailySales = bucketDailySales(
    (recentSales ?? []).map((r) => ({
      created_at: r.created_at as string,
      price_paid_sol: r.price_paid_sol,
    })),
    30
  );

  return (
    <div className="space-y-6">
      <WalletRecovery variant="banner" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="My listings" value={listings ?? 0} />
        <Stat title="Prompts I own" value={purchased ?? 0} />
        <Stat title="Sales" value={sales?.length ?? 0} />
        <Stat title="Earned" value={<PriceTag sol={earned} size="base" />} />
      </div>

      {/* 30-day sales pulse */}
      <div>
        <SalesChart data={dailySales} metric="count" height={100} />
        <Link
          href="/dashboard/earnings"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Detailed earnings <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
