import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyPurchaseTransaction } from "@/lib/solana";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt_id: z.string().uuid(),
  tx_signature: z.string().min(20),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { prompt_id, tx_signature } = parsed.data;

  const supabase = createSupabaseServiceClient();

  const { data: buyer } = await supabase.from("users").select("*").eq("privy_id", privyId).single();
  if (!buyer || !buyer.wallet_address) {
    return NextResponse.json({ error: "Buyer wallet missing" }, { status: 400 });
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
    return NextResponse.json({ error: "Prompt is free — use unlock-free endpoint" }, { status: 400 });
  }
  if (prompt.creator_id === buyer.id) {
    return NextResponse.json({ error: "Cannot buy your own prompt" }, { status: 400 });
  }

  // Already purchased?
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("buyer_id", buyer.id)
    .eq("prompt_id", prompt_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  // Signature already consumed?
  const { data: usedSig } = await supabase
    .from("purchases")
    .select("id")
    .eq("tx_signature", tx_signature)
    .maybeSingle();
  if (usedSig) {
    return NextResponse.json({ error: "Transaction already used" }, { status: 400 });
  }

  const { data: creator } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", prompt.creator_id)
    .single();
  if (!creator?.wallet_address) {
    return NextResponse.json({ error: "Creator wallet missing" }, { status: 400 });
  }

  const verify = await verifyPurchaseTransaction({
    signature: tx_signature,
    expectedBuyer: buyer.wallet_address,
    expectedCreator: creator.wallet_address,
    expectedPriceSol: Number(prompt.price_sol),
  });
  if (!verify.ok) {
    return NextResponse.json({ error: verify.reason ?? "Tx verification failed" }, { status: 400 });
  }

  const { error: insErr } = await supabase.from("purchases").insert({
    buyer_id: buyer.id,
    prompt_id,
    price_paid_sol: prompt.price_sol,
    tx_signature,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
