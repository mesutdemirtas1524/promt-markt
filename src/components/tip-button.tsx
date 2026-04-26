"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, SystemProgram, Transaction, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { toast } from "sonner";
import { Coins, Loader2, X } from "lucide-react";
import { SOLANA_RPC_URL, SOLANA_NETWORK } from "@/lib/constants";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { cn } from "@/lib/utils";

const PRESETS = [0.01, 0.05, 0.1, 0.5];

type Props = {
  creatorWallet: string;
  creatorUsername: string;
  size?: "sm" | "md";
  className?: string;
};

export function TipButton({ creatorWallet, creatorUsername, size = "md", className }: Props) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { usd } = useSolPrice();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0.01);
  const [custom, setCustom] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const buyerWallet = wallets[0];
  const finalAmount = custom ? parseFloat(custom) : amount;
  const validAmount =
    Number.isFinite(finalAmount) && finalAmount >= 0.002 && finalAmount <= 10;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleTip() {
    if (!authenticated) {
      login();
      return;
    }
    if (!buyerWallet) {
      toast.error("No Solana wallet connected.");
      return;
    }
    if (!validAmount) {
      toast.error("Pick an amount between 0.002 and 10 SOL.");
      return;
    }

    setBusy(true);
    try {
      const token = await getAccessToken();
      const checkoutRes = await fetch("/api/user/tip/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          creator_username: creatorUsername,
          amount_sol: finalAmount,
          buyer_wallet: buyerWallet.address,
          message: message.trim() || undefined,
        }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout?.error ?? "Checkout failed");
      const { reference, creator_wallet, lamports } = checkout as {
        reference: string;
        creator_wallet: string;
        lamports: number;
      };

      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const fromKey = new PublicKey(buyerWallet.address);
      const toKey = new PublicKey(creator_wallet);
      const refKey = new PublicKey(reference);

      const transferIx = SystemProgram.transfer({
        fromPubkey: fromKey,
        toPubkey: toKey,
        lamports,
      });
      transferIx.keys.push({ pubkey: refKey, isSigner: false, isWritable: false });

      const tx = new Transaction().add(transferIx);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromKey;

      toast.info("Confirm the tip in your wallet…");
      const serialized = tx.serialize({ requireAllSignatures: false });
      const chain = `solana:${SOLANA_NETWORK === "mainnet-beta" ? "mainnet" : SOLANA_NETWORK}` as
        | "solana:mainnet"
        | "solana:devnet"
        | "solana:testnet";
      const result = await signAndSendTransaction({
        transaction: new Uint8Array(serialized),
        wallet: buyerWallet,
        chain,
      });
      const signature = bs58.encode(result.signature);

      toast.info("Confirming on-chain…");
      const confirmRes = await fetch("/api/user/tip/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference, tx_signature: signature }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err?.error ?? "Tip not confirmed");
      }

      toast.success(`Tipped ${finalAmount} SOL — thanks for supporting @${creatorUsername}!`);
      setOpen(false);
      setMessage("");
      setCustom("");
      setAmount(0.01);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message ?? "Tip failed");
    } finally {
      setBusy(false);
    }
  }

  const sizeClass = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 font-medium tracking-tight text-amber-300 transition-all hover:bg-amber-500/20 active:scale-[0.97]",
          sizeClass,
          className
        )}
      >
        <Coins className="h-3.5 w-3.5" />
        Tip
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur"
          onClick={() => !busy && setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Tip @{creatorUsername}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  100% to the creator. Fully on-chain, no platform cut.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-tint-2 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setAmount(v);
                    setCustom("");
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition-all",
                    !custom && amount === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-tint-1 text-foreground hover:bg-tint-2"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Custom amount (SOL)
            </label>
            <input
              type="number"
              min="0.002"
              max="10"
              step="0.001"
              placeholder="e.g. 0.025"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="mb-1 h-10 w-full rounded-lg border border-input bg-tint-1 px-3 text-sm tabular-nums focus-visible:border-foreground/30 focus-visible:bg-tint-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {validAmount && (
              <p className="mb-3 text-[11px] text-muted-foreground">
                {finalAmount} SOL{usd && ` · ${solToUsdString(finalAmount, usd)}`}
              </p>
            )}

            <label className="mb-1.5 mt-3 block text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Message (optional)
            </label>
            <input
              type="text"
              maxLength={120}
              placeholder="Loved your style"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-tint-1 px-3 text-sm focus-visible:border-foreground/30 focus-visible:bg-tint-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />

            <button
              type="button"
              onClick={handleTip}
              disabled={busy || !validAmount}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 font-medium text-black shadow-[0_8px_24px_-12px_rgba(245,158,11,0.6)] transition-all hover:from-amber-300 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  Send {validAmount ? `${finalAmount} SOL` : "tip"}
                </>
              )}
            </button>

            <p className="mt-3 text-[10.5px] leading-snug text-muted-foreground/80">
              Tips are non-refundable on-chain. Min 0.002 SOL (rent floor).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
