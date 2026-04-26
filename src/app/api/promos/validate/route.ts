import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(1).max(40),
  prompt_id: z.string().uuid(),
});

/**
 * Look up a code in the buyer flow. Returns the discount percent and
 * the code id (used by /checkout to pin the promo to the intent) or
 * a human-readable rejection reason.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createSupabaseServiceClient();

  const { data: buyer } = await supabase
    .from("users")
    .select("id")
    .eq("privy_id", privyId)
    .single();
  if (!buyer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, creator_id")
    .eq("id", parsed.data.prompt_id)
    .single();
  if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("id, creator_id, discount_percent, max_uses, uses, expires_at, active")
    .ilike("code", parsed.data.code)
    .maybeSingle();
  if (!promo) return NextResponse.json({ error: "Code not found" }, { status: 404 });

  if (promo.creator_id !== prompt.creator_id) {
    return NextResponse.json({ error: "Code doesn't apply to this creator" }, { status: 400 });
  }
  if (!promo.active) return NextResponse.json({ error: "Code is disabled" }, { status: 400 });
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }
  if (promo.max_uses !== null && promo.uses >= promo.max_uses) {
    return NextResponse.json({ error: "Code is fully redeemed" }, { status: 400 });
  }

  const { count: usedByMe } = await supabase
    .from("promo_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("code_id", promo.id)
    .eq("buyer_id", buyer.id)
    .eq("prompt_id", prompt.id);
  if ((usedByMe ?? 0) > 0) {
    return NextResponse.json({ error: "Already used on this prompt" }, { status: 400 });
  }

  return NextResponse.json({
    code_id: promo.id,
    discount_percent: promo.discount_percent,
  });
}
