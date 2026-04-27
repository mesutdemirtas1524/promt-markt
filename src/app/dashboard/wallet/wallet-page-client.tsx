"use client";

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { toast } from "sonner";
import { ArrowUpRight, Copy, Loader2, Send, Wallet as WalletIcon } from "lucide-react";
import { SOLANA_RPC_URL, SOLANA_NETWORK } from "@/lib/constants";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { SolLogo } from "@/components/sol-logo";
import { PriceTag } from "@/components/price-tag";
import { WalletRecovery } from "@/components/wallet-recovery";
import { cn } from "@/lib/utils";

// Leave a tiny SOL cushion so a "send max" doesn't fail because of the
// ~5,000-lamport network fee. 0.001 SOL is plenty for one transfer.
const FEE_BUFFER_SOL = 0.001;
const MIN_SEND_SOL = 0.000001;

export function WalletPageClient({ walletAddress }: { walletAddress: string | null }) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const balance = useSolBalance(walletAddress);
  const { usd } = useSolPrice();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const numericAmount = parseFloat(amount);
  const senderWallet = useMemo(
    () => wallets.find((w) => w.address === walletAddress) ?? wallets[0],
    [wallets, walletAddress]
  );

  const recipientValid = useMemo(() => {
    if (!recipient) return false;
    try {
      new PublicKey(recipient.trim());
      return true;
    } catch {
      return false;
    }
  }, [recipient]);

  const sendingToSelf =
    recipientValid && walletAddress && recipient.trim() === walletAddress;

  const maxSendable = balance !== null ? Math.max(0, balance - FEE_BUFFER_SOL) : 0;
  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_SEND_SOL &&
    (balance === null || numericAmount <= maxSendable);

  const canSend =
    authenticated &&
    !!senderWallet &&
    !!walletAddress &&
    recipientValid &&
    !sendingToSelf &&
    amountValid &&
    !busy;

  function setMax() {
    if (balance === null) return;
    if (maxSendable <= 0) {
      toast.error("Not enough SOL to cover the network fee.");
      return;
    }
    setAmount(maxSendable.toFixed(6));
  }

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(
      () => toast.success("Address copied"),
      () => toast.error("Couldn't copy")
    );
  }

  async function handleSend() {
    if (!canSend || !senderWallet || !walletAddress) return;
    setBusy(true);
    setLastTx(null);
    try {
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const fromKey = new PublicKey(walletAddress);
      const toKey = new PublicKey(recipient.trim());
      const lamports = Math.round(numericAmount * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: fromKey, toPubkey: toKey, lamports })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromKey;

      toast.info("Confirm in your wallet…");
      const serialized = tx.serialize({ requireAllSignatures: false });
      const chain = `solana:${SOLANA_NETWORK === "mainnet-beta" ? "mainnet" : SOLANA_NETWORK}` as
        | "solana:mainnet"
        | "solana:devnet"
        | "solana:testnet";

      const result = await signAndSendTransaction({
        transaction: new Uint8Array(serialized),
        wallet: senderWallet,
        chain,
      });
      const signature = bs58.encode(result.signature);
      setLastTx(signature);
      toast.success(`Sent ${numericAmount} SOL`);
      setAmount("");
      setRecipient("");
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message ?? "Transfer failed";
      toast.error(msg.includes("User rejected") ? "Cancelled" : msg);
    } finally {
      setBusy(false);
    }
  }

  if (!walletAddress) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center text-sm text-muted-foreground">
        No wallet linked yet. Sign in with a Solana wallet or social login to provision one.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Wallet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send SOL straight from your in-app wallet to an exchange or any Solana address.
        </p>
      </div>

      {/* Balance + address card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 0% 0%, var(--ambient-a), transparent 60%), radial-gradient(ellipse 50% 80% at 100% 100%, var(--ambient-b), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              <WalletIcon className="h-3 w-3" /> Available balance
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <SolLogo className="h-6 w-6" />
              <span className="text-3xl font-semibold tabular-nums tracking-tight">
                {balance === null ? "—" : balance.toFixed(4)}
              </span>
              <span className="text-base text-muted-foreground">SOL</span>
            </div>
            {balance !== null && usd && (
              <div className="mt-1 text-sm tabular-nums text-muted-foreground">
                ≈ {solToUsdString(balance, usd)}
              </div>
            )}
          </div>
          <div className="min-w-0 sm:max-w-md">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Your address
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-tint-1 px-3 py-2">
              <code className="truncate font-mono text-xs text-foreground">{walletAddress}</code>
              <button
                type="button"
                onClick={copyAddress}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-tint-3 hover:text-foreground"
                aria-label="Copy address"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://solscan.io/account/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-tint-3 hover:text-foreground"
                aria-label="Open in Solscan"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Send form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold tracking-tight">Send SOL</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Double-check the address — Solana transfers are irreversible. To withdraw to an
          exchange, paste the SOL deposit address from your exchange account.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Recipient address
            </label>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste a Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={cn(
                "h-11 w-full rounded-lg border bg-tint-1 px-3 font-mono text-xs tracking-tight focus-visible:bg-tint-2 focus-visible:outline-none focus-visible:ring-2",
                recipient && !recipientValid
                  ? "border-rose-500/40 focus-visible:ring-rose-500/30"
                  : "border-input focus-visible:border-foreground/30 focus-visible:ring-ring/40"
              )}
            />
            {recipient && !recipientValid && (
              <p className="mt-1.5 text-[11px] text-rose-300">Not a valid Solana address.</p>
            )}
            {sendingToSelf && (
              <p className="mt-1.5 text-[11px] text-amber-300">
                That&apos;s your own address — pick a different destination.
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Amount (SOL)
              </label>
              <button
                type="button"
                onClick={setMax}
                disabled={balance === null || maxSendable <= 0}
                className="text-[10.5px] font-medium uppercase tracking-wider text-violet-300 hover:text-violet-200 disabled:opacity-40"
              >
                Max
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_SEND_SOL}
              step="0.0001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-tint-1 px-3 text-base tabular-nums focus-visible:border-foreground/30 focus-visible:bg-tint-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {Number.isFinite(numericAmount) && numericAmount > 0 && usd ? (
                  <>≈ {solToUsdString(numericAmount, usd)}</>
                ) : (
                  <>Min {MIN_SEND_SOL} SOL · network fee ≈ 0.000005 SOL</>
                )}
              </span>
              {balance !== null && (
                <span className="tabular-nums">
                  Available: <PriceTag sol={maxSendable} size="xs" />
                </span>
              )}
            </div>
            {Number.isFinite(numericAmount) &&
              balance !== null &&
              numericAmount > maxSendable && (
                <p className="mt-1.5 text-[11px] text-rose-300">
                  Not enough SOL — leave at least {FEE_BUFFER_SOL} SOL for the network fee.
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-violet-500 to-violet-600 font-medium text-white shadow-[0_8px_24px_-12px_rgba(124,58,237,0.6)] transition-all hover:from-violet-400 hover:to-violet-600 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send{Number.isFinite(numericAmount) && numericAmount > 0 ? ` ${numericAmount} SOL` : ""}
              </>
            )}
          </button>

          {lastTx && (
            <a
              href={`https://solscan.io/tx/${lastTx}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-xs text-emerald-200 hover:bg-emerald-500/[0.1]"
            >
              <span className="font-medium">Transfer confirmed.</span>{" "}
              <span className="font-mono">View on Solscan ↗</span>
            </a>
          )}
        </div>
      </div>

      <WalletRecovery variant="card" />
    </div>
  );
}
