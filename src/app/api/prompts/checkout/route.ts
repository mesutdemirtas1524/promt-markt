import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  generatePurchaseReference,
  solToLamports,
  splitLamports,
} from "@/lib/solana";
import { PLATFORM_WALLET, PROMPT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
  buyer_wallet: z.string().min(32).max(44),
});

/**
 * Create a purchase intent. The server is now the source of truth for
 * recipient addresses and amounts — the client only learns where to send
 * funds AFTER the server has committed the intent. This closes the
 * "client posts a different signature" attack and lets the server discover
 * the resulting tx via the on-chain reference pubkey.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { prompt_id, buyer_wallet } = parsed.data;

  const supabase = createSupabaseServiceClient();

  const { data: buyer } = await supabase
    .from("users")
    .select("id, wallet_address")
    .eq("privy_id", privyId)
    .single();
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  if (buyer.wallet_address !== buyer_wallet) {
    return NextResponse.json(
      { error: "Buyer wallet does not match the wallet on file" },
      { status: 400 }
    );
  }

  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, creator_id, price_sol, status")
    .eq("id", prompt_id)
    .single();
  if (!prompt || prompt.status !== "active") {
    return NextResponse.json({ error: "Prompt not available" }, { status: 404 });
  }
  if (Number(prompt.price_sol) <= 0) {
    return NextResponse.json(
      { error: "Free prompts use the unlock-free endpoint" },
      { status: 400 }
    );
  }
  if (Number(prompt.price_sol) < PROMPT_LIMITS.price.minPaid) {
    return NextResponse.json({ error: "Price below minimum" }, { status: 400 });
  }
  if (prompt.creator_id === buyer.id) {
    return NextResponse.json({ error: "Cannot buy your own prompt" }, { status: 400 });
  }

  // Already purchased? Short-circuit so the buyer doesn't waste SOL.
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("buyer_id", buyer.id)
    .eq("prompt_id", prompt_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ alreadyPurchased: true });
  }

  const { data: creator } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", prompt.creator_id)
    .single();
  if (!creator?.wallet_address) {
    return NextResponse.json({ error: "Creator wallet missing" }, { status: 400 });
  }

  const total = solToLamports(Number(prompt.price_sol));
  const { creatorLamports, platformLamports } = splitLamports(total);
  const reference = generatePurchaseReference();

  const { error: insErr } = await supabase.from("purchase_intents").insert({
    reference,
    buyer_id: buyer.id,
    prompt_id,
    expected_total_lamports: total,
    expected_creator_lamports: creatorLamports,
    expected_platform_lamports: platformLamports,
    expected_buyer_wallet: buyer_wallet,
    expected_creator_wallet: creator.wallet_address,
    expected_platform_wallet: PLATFORM_WALLET,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({
    reference,
    creator_wallet: creator.wallet_address,
    platform_wallet: PLATFORM_WALLET,
    creator_lamports: creatorLamports,
    platform_lamports: platformLamports,
    total_lamports: total,
  });
}
