import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PromosManager, type PromoRow } from "./promos-manager";

export const dynamic = "force-dynamic";

export default async function PromosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("promo_codes")
    .select("id, code, discount_percent, max_uses, uses, expires_at, active, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Promo codes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create discount codes for your prompts. The discount comes out of your share — the
          platform fee is unchanged. Buyers redeem them at checkout.
        </p>
      </div>
      <PromosManager initialPromos={(data ?? []) as PromoRow[]} />
    </div>
  );
}
