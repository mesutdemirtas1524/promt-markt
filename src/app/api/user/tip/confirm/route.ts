import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivyToken } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  findReferenceSignature,
  verifySingleTransferTransaction,
} from "@/lib/solana";
import { emailTip } from "@/lib/email/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  reference: z.string().min(32).max(44),
  tx_signature: z.string().min(20).optional(),
});

/**
 * Confirm a tip. Same Solana Pay reference pattern as purchase confirm —
 * the server is the source of truth for amount + recipient, the client
 * just sends the tx and (optionally) reports the signature back. The
 * verifier matches the on-chain transfer against the intent and inserts
 * a tips row.
 *
 * For tips the platform fee is 0; verifyPurchaseTransaction is called
 * with `expectedCreator === expectedPlatform` (creator wallet) so the
 * existing edge-case branch (creator==platform) handles the math.
 */
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
  const { data: tipper } = await supabase.from("users").select("id").eq("privy_id", privyId).single();
  if (!tipper) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: intent } = await supabase
    .from("tip_intents")
    .select("*")
    .eq("reference", reference)
    .single();
  if (!intent) return NextResponse.json({ error: "Unknown tip reference" }, { status: 404 });
  if (intent.tipper_id !== tipper.id) {
    return NextResponse.json({ error: "Not your tip" }, { status: 403 });
  }
  if (intent.consumed_at) return NextResponse.json({ ok: true, already: true });
  if (new Date(intent.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Tip checkout expired" }, { status: 410 });
  }

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

  const { data: usedSig } = await supabase
    .from("tips")
    .select("id")
    .eq("tx_signature", signature)
    .maybeSingle();
  if (usedSig) {
    return NextResponse.json({ error: "Transaction already used" }, { status: 400 });
  }

  const expectedSol = intent.expected_lamports / 1_000_000_000;
  const verify = await verifySingleTransferTransaction({
    signature,
    expectedFrom: intent.expected_tipper_wallet,
    expectedTo: intent.expected_creator_wallet,
    expectedLamports: intent.expected_lamports,
  });
  if (!verify.ok) {
    return NextResponse.json({ error: verify.reason ?? "Tx verification failed" }, { status: 400 });
  }

  const { error: insErr } = await supabase.from("tips").insert({
    tipper_id: tipper.id,
    creator_id: intent.creator_id,
    amount_sol: expectedSol,
    tx_signature: signature,
    reference,
    message: intent.message ?? null,
  });
  if (insErr && insErr.code !== "23505") {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase
    .from("tip_intents")
    .update({ consumed_at: new Date().toISOString(), consumed_signature: signature })
    .eq("reference", reference);

  void (async () => {
    try {
      const { data: tipperRow } = await supabase
        .from("users")
        .select("display_name, username")
        .eq("id", tipper.id)
        .single();
      if (tipperRow) {
        await emailTip(supabase, {
          creatorId: intent.creator_id,
          tipperName: tipperRow.display_name ?? `@${tipperRow.username}`,
          tipperUsername: tipperRow.username,
          amountSol: expectedSol,
          message: intent.message ?? null,
        });
      }
    } catch (err) {
      console.error("emailTip failed", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
