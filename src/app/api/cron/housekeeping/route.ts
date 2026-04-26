import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cleanup. Vercel Cron hits this; the auth check accepts either
 * Vercel's own bearer (CRON_SECRET) or our app secret (HOUSEKEEPING_SECRET)
 * so we can run it manually too without exposing a way for the public
 * to drop rows.
 *
 * What it does:
 *  - drop expired purchase_intents and tip_intents that never settled
 *  - flip promo_codes.active=false once expires_at has passed
 *  - prune prompt_views older than 90 days (cached counters stay)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [intents, tips, promos, views] = await Promise.all([
    supabase
      .from("purchase_intents")
      .delete({ count: "exact" })
      .lt("expires_at", now)
      .is("consumed_at", null),
    supabase
      .from("tip_intents")
      .delete({ count: "exact" })
      .lt("expires_at", now)
      .is("consumed_at", null),
    supabase
      .from("promo_codes")
      .update({ active: false }, { count: "exact" })
      .eq("active", true)
      .not("expires_at", "is", null)
      .lt("expires_at", now),
    supabase
      .from("prompt_views")
      .delete({ count: "exact" })
      .lt("created_at", ninetyDaysAgo),
  ]);

  return NextResponse.json({
    ok: true,
    ranAt: now,
    purchase_intents_dropped: intents.count ?? 0,
    tip_intents_dropped: tips.count ?? 0,
    promos_expired: promos.count ?? 0,
    prompt_views_pruned: views.count ?? 0,
    errors: {
      intents: intents.error?.message ?? null,
      tips: tips.error?.message ?? null,
      promos: promos.error?.message ?? null,
      views: views.error?.message ?? null,
    },
  });
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  if (process.env.HOUSEKEEPING_SECRET && token === process.env.HOUSEKEEPING_SECRET) return true;
  return false;
}
