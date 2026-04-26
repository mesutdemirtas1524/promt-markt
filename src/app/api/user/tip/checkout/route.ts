import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePurchaseReference, solToLamports } from "@/lib/solana";

export const runtime = "nodejs";

const bodySchema = z.object({
  creator_username: z.string().min(3).max(24),
  amount_sol: z.number().positive().min(0.002).max(10),
  buyer_wallet: z.string().min(32).max(44),
  message: z.string().max(280).optional(),
});

/**
 * Create a tip intent. Mirror of /api/prompts/checkout but for direct
 * SOL transfers to a creator (no purchase, no split — 100% to creator).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { creator_username, amount_sol, buyer_wallet, message } = parsed.data;

  const supabase = createSupabaseServiceClient();

  const { data: tipper } = await supabase
    .from("users")
    .select("id, wallet_address")
    .eq("privy_id", privyId)
    .single();
  if (!tipper) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (tipper.wallet_address !== buyer_wallet) {
    return NextResponse.json({ error: "Wallet mismatch" }, { status: 400 });
  }

  const { data: creator } = await supabase
    .from("users")
    .select("id, username, wallet_address")
    .eq("username", creator_username)
    .maybeSingle();
  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  if (!creator.wallet_address) {
    return NextResponse.json({ error: "Creator has no wallet" }, { status: 400 });
  }
  if (creator.id === tipper.id) {
    return NextResponse.json({ error: "Cannot tip yourself" }, { status: 400 });
  }

  const lamports = solToLamports(amount_sol);
  const reference = generatePurchaseReference();

  const { error: insErr } = await supabase.from("tip_intents").insert({
    reference,
    tipper_id: tipper.id,
    creator_id: creator.id,
    expected_lamports: lamports,
    expected_tipper_wallet: buyer_wallet,
    expected_creator_wallet: creator.wallet_address,
    message: message ?? null,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    reference,
    creator_id: creator.id,
    creator_username: creator.username,
    creator_wallet: creator.wallet_address,
    lamports,
    message: message ?? null,
  });
}
