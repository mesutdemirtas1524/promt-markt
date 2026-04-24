import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PLATFORM_FEE_BPS, PLATFORM_WALLET, SOLANA_RPC_URL } from "./constants";

export function getSolanaConnection() {
  return new Connection(SOLANA_RPC_URL, "confirmed");
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
  const parsed = await connection.getParsedTransaction(params.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!parsed) return { ok: false, reason: "Transaction not found or not confirmed yet." };
  if (parsed.meta?.err) return { ok: false, reason: "Transaction failed on-chain." };

  const expectedTotal = solToLamports(params.expectedPriceSol);
  const { creatorLamports, platformLamports } = splitLamports(expectedTotal);

  // Walk through instructions, summing transfers to creator and platform wallets.
  let toCreator = 0;
  let toPlatform = 0;
  let buyerSigned = false;

  // Verify buyer signed
  const accountKeys = parsed.transaction.message.accountKeys;
  for (const key of accountKeys) {
    if (key.pubkey.toBase58() === params.expectedBuyer && key.signer) {
      buyerSigned = true;
    }
  }
  if (!buyerSigned) return { ok: false, reason: "Buyer did not sign this transaction." };

  const instructions = parsed.transaction.message.instructions;
  for (const ix of instructions) {
    // Narrow to parsed system transfer
    if ("parsed" in ix && ix.program === "system" && ix.parsed?.type === "transfer") {
      const { destination, lamports, source } = ix.parsed.info as {
        source: string;
        destination: string;
        lamports: number;
      };
      if (source !== params.expectedBuyer) continue;
      if (destination === params.expectedCreator) toCreator += lamports;
      else if (destination === PLATFORM_WALLET) toPlatform += lamports;
    }
  }

  // Allow a tiny rounding tolerance (1 lamport)
  if (Math.abs(toCreator - creatorLamports) > 1) {
    return { ok: false, reason: `Creator received wrong amount (got ${toCreator}, expected ${creatorLamports}).` };
  }
  if (Math.abs(toPlatform - platformLamports) > 1) {
    return { ok: false, reason: `Platform received wrong amount (got ${toPlatform}, expected ${platformLamports}).` };
  }

  return { ok: true };
}
