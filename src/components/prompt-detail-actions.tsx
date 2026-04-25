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
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { useT } from "@/lib/i18n/provider";

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
  const { dbUser } = useCurrentUser();
  const { usd } = useSolPrice();
  const router = useRouter();
  const { t } = useT();

  const priceUsd = solToUsdString(props.priceSol, usd);

  const [buying, setBuying] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [localRating, setLocalRating] = useState<number | null>(props.myRating);

  const buyerWallet = wallets[0];

  const pendingKey = `pending-tx-${props.promptId}`;

  async function claimSignature(signature: string): Promise<boolean> {
    const token = await getAccessToken();
    const res = await fetch("/api/prompts/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt_id: props.promptId, tx_signature: signature }),
    });
    if (res.ok) {
      localStorage.removeItem(pendingKey);
      return true;
    }
    const data = await res.json().catch(() => ({}));
    // Transient: tx not indexed yet — keep the pending record for retry
    if (res.status >= 500 || /not found/i.test(data?.error ?? "")) return false;
    // Permanent failure (wrong amount, not buyer, etc.) — forget it
    localStorage.removeItem(pendingKey);
    throw new Error(data?.error ?? "Verification failed");
  }

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

      // Recover a previously-submitted tx before creating a new one.
      const pending = typeof window !== "undefined" ? localStorage.getItem(pendingKey) : null;
      if (pending) {
        toast.info("Checking your previous transaction…");
        const ok = await claimSignature(pending);
        if (ok) {
          toast.success("Previous purchase recovered — unlocked.");
          router.refresh();
          return;
        }
        toast.info("Previous tx still pending on-chain — retrying in a moment…");
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
      // Persist immediately — even if the user closes the tab, the next click
      // will try to claim this signature instead of charging them again.
      localStorage.setItem(pendingKey, signature);

      toast.info("Confirming on-chain…");
      const ok = await claimSignature(signature);
      if (!ok) {
        toast.error(
          "Transaction sent but not yet indexed. Click Buy again in ~30s to recover it — you won't be charged twice."
        );
        return;
      }

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
    toast.success(t("detail.copied"));
  }

  return (
    <div className="space-y-3.5">
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.prompt")}
          </span>
          {props.hasAccess && props.promptText && (
            <Button size="sm" variant="ghost" onClick={copyPrompt} className="h-7 px-2 text-xs">
              {t("detail.copy")}
            </Button>
          )}
        </div>
        {props.hasAccess && props.promptText ? (
          <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-foreground">
            {props.promptText}
          </pre>
        ) : (
          <div className="relative min-h-36 p-4">
            <pre className="blur-prompt whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-muted-foreground">
              {"A majestic lion standing on a cliff at golden hour, ultra detailed, cinematic lighting, 8k resolution, hyper realistic, --ar 16:9 --style raw --v 6"}
            </pre>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3.5 py-1.5 text-xs backdrop-blur">
                <Lock className="h-3.5 w-3.5" />
                {props.priceSol === 0
                  ? t("detail.signInToUnlock")
                  : `${t("detail.unlockFor")} ${formatSol(props.priceSol)} SOL${priceUsd ? ` · ${priceUsd}` : ""}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {!props.hasAccess && !props.isOwnPrompt && (
        <Button
          onClick={handlePurchase}
          size="lg"
          variant="primary"
          className="w-full"
          disabled={buying}
        >
          {buying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("detail.processing")}
            </>
          ) : props.priceSol === 0 ? (
            t("detail.unlockFree")
          ) : (
            <>
              {t("detail.buyFor")} {formatSol(props.priceSol)} SOL
              {priceUsd && <span className="opacity-70">· {priceUsd}</span>}
            </>
          )}
        </Button>
      )}

      {props.isOwnPrompt && (
        <div className="rounded-xl border border-border bg-tint-1 p-3 text-[11px] text-muted-foreground">
          {t("detail.ownPrompt")}
        </div>
      )}

      {props.hasAccess && !props.isOwnPrompt && props.priceSol > 0 && (
        <div className="rounded-xl border border-border bg-tint-1 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Star className="h-3.5 w-3.5" />
            {localRating ? t("detail.yourRating") : t("detail.rateThis")}
          </div>
          <RatingStars value={localRating} onChange={handleRate} readOnly={submittingRating} />
          <p className="mt-2 text-[11px] text-muted-foreground/80">{t("detail.ratingHint")}</p>
        </div>
      )}
    </div>
  );
}
