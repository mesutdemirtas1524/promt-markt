import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load .env.local manually (Node doesn't read it by default for scripts)
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env.local");
const envText = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim()];
    })
);

const [signature, buyerWallet, creatorWallet, lamports] = process.argv.slice(2);
if (!signature || !buyerWallet || !creatorWallet || !lamports) {
  console.error("Usage: node recover-purchase.mjs <signature> <buyer_wallet> <creator_wallet> <creator_lamports>");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Total paid = creator share / 0.8
const creatorLamports = Number(lamports);
const totalSol = creatorLamports / 0.8 / 1_000_000_000;

const { data: buyer } = await supabase.from("users").select("id").eq("wallet_address", buyerWallet).single();
const { data: creator } = await supabase.from("users").select("id").eq("wallet_address", creatorWallet).single();
if (!buyer || !creator) {
  console.error("Buyer or creator not found in DB");
  process.exit(1);
}

const { data: prompts } = await supabase
  .from("prompts")
  .select("id, title, price_sol")
  .eq("creator_id", creator.id)
  .eq("price_sol", totalSol);

if (!prompts || prompts.length === 0) {
  console.error(`No prompt found for creator ${creator.id} with price ${totalSol} SOL`);
  process.exit(1);
}
if (prompts.length > 1) {
  console.error(`Ambiguous — ${prompts.length} prompts match. Listing:`);
  for (const p of prompts) console.error(`  ${p.id} — ${p.title}`);
  process.exit(1);
}

const prompt = prompts[0];
console.log(`Matched prompt: ${prompt.id} — "${prompt.title}" @ ${prompt.price_sol} SOL`);

const { error } = await supabase.from("purchases").insert({
  buyer_id: buyer.id,
  prompt_id: prompt.id,
  price_paid_sol: totalSol,
  tx_signature: signature,
});
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}
console.log("✅ Purchase recorded.");
