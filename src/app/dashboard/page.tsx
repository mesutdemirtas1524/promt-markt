import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSol } from "@/lib/utils";
import { CREATOR_SHARE_BPS } from "@/lib/constants";

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();

  const [{ count: listings }, { count: purchased }, { data: sales }] = await Promise.all([
    supabase.from("prompts").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
    supabase
      .from("purchases")
      .select("price_paid_sol, prompts!inner(creator_id)")
      .eq("prompts.creator_id", user.id),
  ]);

  const totalSales = (sales ?? []).reduce((sum, p) => sum + Number(p.price_paid_sol ?? 0), 0);
  const earned = (totalSales * CREATOR_SHARE_BPS) / 10_000;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat title="My listings" value={listings ?? 0} />
      <Stat title="Prompts I own" value={purchased ?? 0} />
      <Stat title="Sales" value={sales?.length ?? 0} />
      <Stat title="Earned" value={`${formatSol(earned)} SOL`} />
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
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
