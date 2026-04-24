"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { Button } from "./ui/button";
import { RatingStars } from "./rating-stars";
import { toast } from "sonner";
import { PublicKey, SystemProgram, Transaction, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import {
  PLATFORM_FEE_BPS,
  PLATFORM_WALLET,
  SOLANA_RPC_URL,
  SOLANA_NETWORK,
  LAMPORTS_PER_SOL,
} from "@/lib/constants";
import { formatSol } from "@/lib/utils";
import { Loader2, Lock, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncUser } from "@/hooks/use-sync-user";

type Props = {
  promptId: string;
  priceSol: number;
  creatorWallet: string | null;
  hasAccess: boolean;
  isOwnPrompt: boolean;
  myRating: number | null;
  promptText: string | null;
};

export function PromptDetailActions(props: Props) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { dbUser } = useSyncUser();
  const router = useRouter();

  const [buying, setBuying] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(props.myRating);

  const buyerWallet = wallets[0];

  async function handlePurchase() {
    if (!authenticated) {
      login();
      return;
    }
    if (!buyerWallet) {
      toast.error("No Solana wallet connected.");
      return;
    }
    if (!props.creatorWallet) {
      toast.error("Creator has no wallet on file.");
      return;
    }

    setBuying(true);
    try {
      if (props.priceSol === 0) {
        const token = await getAccessToken();
        const res = await fetch("/api/prompts/unlock-free", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prompt_id: props.promptId }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        toast.success("Unlocked!");
        router.refresh();
        return;
      }

      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const totalLamports = Math.round(props.priceSol * LAMPORTS_PER_SOL);
      const platformLamports = Math.floor((totalLamports * PLATFORM_FEE_BPS) / 10_000);
      const creatorLamports = totalLamports - platformLamports;

      const buyerPubkey = new PublicKey(buyerWallet.address);

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: new PublicKey(props.creatorWallet),
          lamports: creatorLamports,
        })
      );
      tx.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports: platformLamports,
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = buyerPubkey;

      toast.info("Please confirm in your wallet…");
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
      await connection.confirmTransaction(signature, "confirmed");

      const token = await getAccessToken();
      const res = await fetch("/api/prompts/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: props.promptId, tx_signature: signature }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Purchase verification failed");

      toast.success("Purchased! Prompt unlocked.");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message ?? "Purchase failed");
    } finally {
      setBuying(false);
    }
  }

  async function handleRate(stars: number) {
    if (!authenticated || !dbUser) {
      login();
      return;
    }
    setSubmittingRating(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/prompts/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: props.promptId, stars }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setLocalRating(stars);
      toast.success("Rating saved.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmittingRating(false);
    }
  }

  function copyPrompt() {
    if (!props.promptText) return;
    navigator.clipboard.writeText(props.promptText);
    toast.success("Copied to clipboard.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Prompt</span>
          {props.hasAccess && props.promptText && (
            <Button size="sm" variant="ghost" onClick={copyPrompt}>
              Copy
            </Button>
          )}
        </div>
        {props.hasAccess && props.promptText ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
            {props.promptText}
          </pre>
        ) : (
          <div className="relative min-h-32">
            <pre className="blur-prompt whitespace-pre-wrap break-words font-mono text-sm text-muted-foreground">
              {"A majestic lion standing on a cliff at golden hour, ultra detailed, cinematic lighting, 8k resolution, hyper realistic, --ar 16:9 --style raw --v 6"}
            </pre>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur">
                <Lock className="h-3.5 w-3.5" />
                {props.priceSol === 0 ? "Sign in to unlock" : `Unlock for ${formatSol(props.priceSol)} SOL`}
              </div>
            </div>
          </div>
        )}
      </div>

      {!props.hasAccess && !props.isOwnPrompt && (
        <Button onClick={handlePurchase} size="lg" className="w-full" disabled={buying}>
          {buying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : props.priceSol === 0 ? (
            "Unlock for free"
          ) : (
            `Buy for ${formatSol(props.priceSol)} SOL`
          )}
        </Button>
      )}

      {props.isOwnPrompt && (
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          This is your prompt. Buyers see the prompt text only after purchasing.
        </div>
      )}

      {props.hasAccess && !props.isOwnPrompt && props.priceSol > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4" />
            {localRating ? "Your rating" : "Rate this prompt"}
          </div>
          <RatingStars value={localRating} onChange={handleRate} readOnly={submittingRating} />
          <p className="mt-2 text-xs text-muted-foreground">You can change your rating anytime.</p>
        </div>
      )}
    </div>
  );
}
