import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  findReferenceSignature,
  verifyPurchaseTransaction,
} from "@/lib/solana";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Confirm a purchase. The client may post the tx signature for the fast
 * path; if it can't, the server discovers the signature on-chain via the
 * reference pubkey baked into the tx (Solana Pay convention).
 *
 * The intent row is the canonical source of truth — it pins the buyer,
 * recipient wallets, and exact lamport amounts. The verifier matches the
 * on-chain tx against those values, then atomically inserts the purchase
 * and marks the intent consumed.
 */
const bodySchema = z.object({
  reference: z.string().min(32).max(44),
  tx_signature: z.string().min(20).optional(),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const privyId = await verifyPrivyToken(token);
  if (!privyId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { reference, tx_signature: hint } = parsed.data;

  const supabase = createSupabaseServiceClient();

  const { data: buyer } = await supabase
    .from("users")
    .select("id")
    .eq("privy_id", privyId)
    .single();
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });

  const { data: intent } = await supabase
    .from("purchase_intents")
    .select("*")
    .eq("reference", reference)
    .single();
  if (!intent) return NextResponse.json({ error: "Unknown checkout reference" }, { status: 404 });
  if (intent.buyer_id !== buyer.id) {
    return NextResponse.json({ error: "Not your checkout" }, { status: 403 });
  }
  if (intent.consumed_at) {
    // Idempotent: a second confirm for the same intent that already settled
    // is treated as success so retries from the client don't error out.
    return NextResponse.json({ ok: true, already: true });
  }
  if (new Date(intent.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Checkout expired — start again" }, { status: 410 });
  }

  // Locate the on-chain tx: trust the client hint if provided, otherwise
  // discover via the reference pubkey.
  let signature: string | null = hint ?? null;
  if (!signature) {
    signature = await findReferenceSignature(reference, { maxAttempts: 8, intervalMs: 2_000 });
  }
  if (!signature) {
    return NextResponse.json(
      { error: "Transaction not found yet. Try again in ~30s." },
      { status: 404 }
    );
  }

  // Reject signatures already used by another purchase row.
  const { data: usedSig } = await supabase
    .from("purchases")
    .select("id")
    .eq("tx_signature", signature)
    .maybeSingle();
  if (usedSig) {
    return NextResponse.json({ error: "Transaction already used" }, { status: 400 });
  }

  const expectedPriceSol = intent.expected_total_lamports / 1_000_000_000;
  const verify = await verifyPurchaseTransaction({
    signature,
    expectedBuyer: intent.expected_buyer_wallet,
    expectedCreator: intent.expected_creator_wallet,
    expectedPriceSol,
  });
  if (!verify.ok) {
    return NextResponse.json({ error: verify.reason ?? "Tx verification failed" }, { status: 400 });
  }

  // Atomic-ish: insert the purchase, then mark the intent consumed. If the
  // intent update fails after insert, a future confirm sees the
  // "already used" branch and returns success.
  const { error: insErr } = await supabase.from("purchases").insert({
    buyer_id: buyer.id,
    prompt_id: intent.prompt_id,
    price_paid_sol: expectedPriceSol,
    tx_signature: signature,
    reference,
  });
  if (insErr) {
    // Race condition: another concurrent confirm beat us. If the row exists
    // for this signature, treat as success.
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase
    .from("purchase_intents")
    .update({ consumed_at: new Date().toISOString(), consumed_signature: signature })
    .eq("reference", reference);

  return NextResponse.json({ ok: true });
}
