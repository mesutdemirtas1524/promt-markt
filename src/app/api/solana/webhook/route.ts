import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyPurchaseTransaction } from "@/lib/solana";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Helius enhanced webhook receiver. Configure in the Helius dashboard:
 *   - URL: https://promtmarkt.com/api/solana/webhook
 *   - Type: Enhanced (parsed)
 *   - Account addresses: NEXT_PUBLIC_PLATFORM_WALLET
 *   - Auth header: Authorization = HELIUS_WEBHOOK_SECRET (recommended)
 *
 * Every purchase tx pays the platform wallet, so subscribing to that one
 * address catches every checkout. The tx also carries the Solana Pay
 * reference key (attached by the client at build time); we use that to
 * locate the matching purchase_intent and confirm without waiting for
 * the buyer's client to POST the signature.
 */
export async function POST(req: NextRequest) {
  // Auth — Helius lets you configure an Authorization header on the webhook.
  // If we set HELIUS_WEBHOOK_SECRET, require it on every request.
  const expected = process.env.HELIUS_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("authorization") ?? "";
    // Helius can send the secret either bare or with "Bearer " prefix
    const stripped = got.replace(/^Bearer\s+/i, "").trim();
    if (stripped !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body) ? body : [body];
  const supabase = createSupabaseServiceClient();
  const results: Array<{ signature: string; status: string; reason?: string }> = [];

  for (const ev of events) {
    const event = ev as HeliusTxEvent;
    const signature = event?.signature;
    if (!signature || typeof signature !== "string") {
      results.push({ signature: "?", status: "skip", reason: "no signature" });
      continue;
    }

    // Collect every public key we can find in this event — one of them
    // will be the Solana Pay reference we attached client-side.
    const candidates = collectAccountKeys(event);
    if (candidates.size === 0) {
      results.push({ signature, status: "skip", reason: "no account keys" });
      continue;
    }

    // Match against any unconsumed intent
    const referenceList = Array.from(candidates);
    const { data: intents } = await supabase
      .from("purchase_intents")
      .select("*")
      .in("reference", referenceList)
      .is("consumed_at", null);

    if (!intents || intents.length === 0) {
      results.push({ signature, status: "no-intent" });
      continue;
    }

    for (const intent of intents) {
      // Idempotency: skip if a purchase already exists for this signature
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("tx_signature", signature)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("purchase_intents")
          .update({ consumed_at: new Date().toISOString(), consumed_signature: signature })
          .eq("reference", intent.reference)
          .is("consumed_at", null);
        results.push({ signature, status: "already-purchased" });
        continue;
      }

      const expectedPriceSol = intent.expected_total_lamports / 1_000_000_000;
      const verify = await verifyPurchaseTransaction({
        signature,
        expectedBuyer: intent.expected_buyer_wallet,
        expectedCreator: intent.expected_creator_wallet,
        expectedPriceSol,
      });
      if (!verify.ok) {
        results.push({ signature, status: "verify-failed", reason: verify.reason });
        continue;
      }

      const { error: insErr } = await supabase.from("purchases").insert({
        buyer_id: intent.buyer_id,
        prompt_id: intent.prompt_id,
        price_paid_sol: expectedPriceSol,
        tx_signature: signature,
        reference: intent.reference,
      });
      if (insErr && insErr.code !== "23505") {
        results.push({ signature, status: "insert-failed", reason: insErr.message });
        continue;
      }

      await supabase
        .from("purchase_intents")
        .update({ consumed_at: new Date().toISOString(), consumed_signature: signature })
        .eq("reference", intent.reference)
        .is("consumed_at", null);

      results.push({ signature, status: "confirmed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

// ---------------------------------------------------------------------------
// Helius enhanced webhook payload typing — only the fields we read.
// ---------------------------------------------------------------------------

type HeliusInstruction = {
  programId?: string;
  accounts?: string[];
  data?: string;
  innerInstructions?: HeliusInstruction[];
};

type HeliusTxEvent = {
  signature?: string;
  feePayer?: string;
  instructions?: HeliusInstruction[];
  accountData?: Array<{ account?: string }>;
  nativeTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string }>;
  tokenTransfers?: Array<{ fromUserAccount?: string; toUserAccount?: string }>;
};

function collectAccountKeys(ev: HeliusTxEvent): Set<string> {
  const out = new Set<string>();
  const push = (v?: string) => {
    if (v) out.add(v);
  };

  push(ev.feePayer);
  for (const a of ev.accountData ?? []) push(a.account);
  for (const t of ev.nativeTransfers ?? []) {
    push(t.fromUserAccount);
    push(t.toUserAccount);
  }
  for (const t of ev.tokenTransfers ?? []) {
    push(t.fromUserAccount);
    push(t.toUserAccount);
  }
  const visit = (ixs: HeliusInstruction[] | undefined) => {
    for (const ix of ixs ?? []) {
      for (const a of ix.accounts ?? []) push(a);
      visit(ix.innerInstructions);
    }
  };
  visit(ev.instructions);

  return out;
}
