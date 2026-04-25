import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import { PLATFORM_FEE_BPS, PLATFORM_WALLET, SOLANA_RPC_URL } from "./constants";

/**
 * Server-side RPC. Prefers HELIUS_RPC_URL (private, with API key) for
 * higher rate limits, better latency, and webhook support. Falls back to
 * the public RPC the client uses if no Helius URL is configured.
 */
function getServerRpcUrl(): string {
  return process.env.HELIUS_RPC_URL || SOLANA_RPC_URL;
}

/**
 * Generate a fresh, throwaway pubkey to use as a Solana Pay-style "reference"
 * on a checkout. The secret half is discarded — we only need the public part
 * recorded on-chain so the server can later locate the tx via
 * `getSignaturesForAddress(reference)`.
 */
export function generatePurchaseReference(): string {
  return Keypair.generate().publicKey.toBase58();
}

/**
 * Discover a tx that includes the given `reference` pubkey. Polls a few
 * times because public RPCs are eventually consistent.
 *
 * Returns the signature of the first matching tx, or null if not found.
 */
export async function findReferenceSignature(
  reference: string,
  opts: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<string | null> {
  const connection = getSolanaConnection();
  const referenceKey = new PublicKey(reference);
  // Defaults assume Helius webhook is also racing to confirm the tx; the
  // polling here is a fallback for the few seconds before the webhook
  // arrives. Caller can override for slower setups.
  const maxAttempts = opts.maxAttempts ?? 8;
  const intervalMs = opts.intervalMs ?? 2_000;

  for (let i = 0; i < maxAttempts; i++) {
    const sigs = await connection.getSignaturesForAddress(
      referenceKey,
      { limit: 1 },
      "confirmed"
    );
    if (sigs.length > 0) return sigs[0].signature;
    if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

export function getSolanaConnection() {
  return new Connection(getServerRpcUrl(), "confirmed");
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function splitLamports(totalLamports: number): { creatorLamports: number; platformLamports: number } {
  const platformLamports = Math.floor((totalLamports * PLATFORM_FEE_BPS) / 10_000);
  const creatorLamports = totalLamports - platformLamports;
  return { creatorLamports, platformLamports };
}

/**
 * Build a transaction that pays the creator (80%) and platform (20%) in one atomic tx.
 * Two SystemProgram.transfer instructions; either both succeed or both fail.
 */
export async function buildPurchaseTransaction(params: {
  buyerPubkey: PublicKey;
  creatorPubkey: PublicKey;
  priceSol: number;
}): Promise<Transaction> {
  const connection = getSolanaConnection();
  const totalLamports = solToLamports(params.priceSol);
  const { creatorLamports, platformLamports } = splitLamports(totalLamports);

  const tx = new Transaction();

  tx.add(
    SystemProgram.transfer({
      fromPubkey: params.buyerPubkey,
      toPubkey: params.creatorPubkey,
      lamports: creatorLamports,
    })
  );

  tx.add(
    SystemProgram.transfer({
      fromPubkey: params.buyerPubkey,
      toPubkey: new PublicKey(PLATFORM_WALLET),
      lamports: platformLamports,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.buyerPubkey;

  return tx;
}

/**
 * Server-side verification — fetch the transaction from the Solana RPC and confirm:
 *   1. It exists and is confirmed
 *   2. Buyer signed it
 *   3. Creator received ~80% of priceSol
 *   4. Platform wallet received ~20% of priceSol
 *
 * Returns true if all checks pass.
 */
export async function verifyPurchaseTransaction(params: {
  signature: string;
  expectedBuyer: string;
  expectedCreator: string;
  expectedPriceSol: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const connection = getSolanaConnection();

  // ~16s polling. Helius RPC indexes within ~1s; the public mainnet RPC
  // may need a few seconds. The webhook path is the primary success
  // pipeline — this fallback covers the early window before it fires.
  const maxAttempts = 8;
  let parsed = null;
  for (let i = 0; i < maxAttempts; i++) {
    parsed = await connection.getParsedTransaction(params.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (parsed) break;
    await new Promise((r) => setTimeout(r, 2_000));
  }

  if (!parsed) return { ok: false, reason: "Transaction not found after 45 seconds. It may still confirm — try again in a moment." };
  if (parsed.meta?.err) return { ok: false, reason: "Transaction failed on-chain." };

  const expectedTotal = solToLamports(params.expectedPriceSol);
  const { creatorLamports, platformLamports } = splitLamports(expectedTotal);

  let toCreator = 0;
  let toPlatform = 0;
  let buyerSigned = false;

  const accountKeys = parsed.transaction.message.accountKeys;
  for (const key of accountKeys) {
    if (key.pubkey.toBase58() === params.expectedBuyer && key.signer) {
      buyerSigned = true;
    }
  }
  if (!buyerSigned) return { ok: false, reason: "Buyer did not sign this transaction." };

  const instructions = parsed.transaction.message.instructions;
  for (const ix of instructions) {
    if ("parsed" in ix && ix.program === "system" && ix.parsed?.type === "transfer") {
      const { destination, lamports, source } = ix.parsed.info as {
        source: string;
        destination: string;
        lamports: number;
      };
      if (source !== params.expectedBuyer) continue;
      if (destination === params.expectedCreator) toCreator += lamports;
      if (destination === PLATFORM_WALLET) toPlatform += lamports;
    }
  }

  // Edge case: creator wallet == platform wallet (e.g., platform owner sells their own prompt).
  // The same destination got counted in both buckets. Require the total received to equal the price.
  if (params.expectedCreator === PLATFORM_WALLET) {
    if (Math.abs(toCreator - expectedTotal) > 1) {
      return { ok: false, reason: `Total received wrong amount (got ${toCreator}, expected ${expectedTotal}).` };
    }
    return { ok: true };
  }

  if (Math.abs(toCreator - creatorLamports) > 1) {
    return { ok: false, reason: `Creator received wrong amount (got ${toCreator}, expected ${creatorLamports}).` };
  }
  if (Math.abs(toPlatform - platformLamports) > 1) {
    return { ok: false, reason: `Platform received wrong amount (got ${toPlatform}, expected ${platformLamports}).` };
  }

  return { ok: true };
}
