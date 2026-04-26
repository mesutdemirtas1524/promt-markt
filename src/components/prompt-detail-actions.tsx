"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { Button } from "./ui/button";
import { RatingStars } from "./rating-stars";
import { toast } from "sonner";
import { PublicKey, SystemProgram, Transaction, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { SOLANA_RPC_URL, SOLANA_NETWORK } from "@/lib/constants";
import { formatSol } from "@/lib/utils";
import { Loader2, Lock, Star, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { useT } from "@/lib/i18n/provider";
import { PromptText } from "./prompt-text";
import type { PromptAnalysis } from "@/lib/prompt-analysis";
import { Hash, Type, Sparkles as SparklesIcon } from "lucide-react";

type Props = {
  promptId: string;
  priceSol: number;
  creatorWallet: string | null;
  hasAccess: boolean;
  isOwnPrompt: boolean;
  myRating: number | null;
  promptText: string | null;
  analysis: PromptAnalysis | null;
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

  const [promoInput, setPromoInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount_percent: number;
  } | null>(null);

  const effectivePriceSol = appliedPromo
    ? props.priceSol * (1 - appliedPromo.discount_percent / 100)
    : props.priceSol;
  const effectivePriceUsd = solToUsdString(effectivePriceSol, usd);

  async function applyPromo() {
    if (!authenticated) {
      login();
      return;
    }
    const code = promoInput.trim();
    if (!code) return;
    setApplyingPromo(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, prompt_id: props.promptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Invalid code");
      setAppliedPromo({ code, discount_percent: data.discount_percent });
      toast.success(`${data.discount_percent}% off applied`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setApplyingPromo(false);
    }
  }

  function clearPromo() {
    setAppliedPromo(null);
    setPromoInput("");
  }

  const buyerWallet = wallets[0];

  // Per-prompt pending checkout (reference + sig if signed). If the user
  // closes the tab mid-flow the next attempt will resume rather than re-pay.
  const pendingKey = `pending-checkout-${props.promptId}`;
  type Pending = { reference: string; signature?: string };

  function readPending(): Pending | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(pendingKey);
      return raw ? (JSON.parse(raw) as Pending) : null;
    } catch {
      return null;
    }
  }
  function writePending(p: Pending) {
    if (typeof window !== "undefined") localStorage.setItem(pendingKey, JSON.stringify(p));
  }
  function clearPending() {
    if (typeof window !== "undefined") localStorage.removeItem(pendingKey);
  }

  async function confirmReference(reference: string, signature?: string): Promise<boolean> {
    const token = await getAccessToken();
    const res = await fetch("/api/prompts/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reference, tx_signature: signature }),
    });
    if (res.ok) {
      clearPending();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    // Transient: tx not yet indexed — keep pending for retry
    if (res.status === 404 && /not found/i.test(data?.error ?? "")) return false;
    if (res.status === 410) {
      // Intent expired — drop pending so a fresh checkout can run
      clearPending();
    } else {
      clearPending();
    }
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

      // 1. Resume an in-flight checkout if any
      const pending = readPending();
      if (pending) {
        toast.info("Checking your previous transaction…");
        try {
          const ok = await confirmReference(pending.reference, pending.signature);
          if (ok) {
            toast.success("Previous purchase recovered — unlocked.");
            router.refresh();
            return;
          }
          toast.info("Previous tx still pending on-chain — retrying in a moment…");
        } catch {
          // expired or invalid — fall through to a new checkout
        }
      }

      // 2. Ask the server to create a checkout intent (server is source of truth)
      const token = await getAccessToken();
      const checkoutRes = await fetch("/api/prompts/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt_id: props.promptId,
          buyer_wallet: buyerWallet.address,
          ...(appliedPromo ? { promo_code: appliedPromo.code } : {}),
        }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout?.error ?? "Checkout failed");
      if (checkout.alreadyPurchased) {
        toast.success("You already own this prompt.");
        router.refresh();
        return;
      }
      const {
        reference,
        creator_wallet,
        platform_wallet,
        creator_lamports,
        platform_lamports,
      } = checkout as {
        reference: string;
        creator_wallet: string;
        platform_wallet: string;
        creator_lamports: number;
        platform_lamports: number;
      };
      writePending({ reference });

      // 3. Build the tx with two transfers + the reference attached as a
      //    non-signer key on one of them (Solana Pay convention) so the
      //    server can later discover the tx by querying the reference key.
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const buyerPubkey = new PublicKey(buyerWallet.address);
      const referenceKey = new PublicKey(reference);

      const creatorIx = SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: new PublicKey(creator_wallet),
        lamports: creator_lamports,
      });
      const platformIx = SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: new PublicKey(platform_wallet),
        lamports: platform_lamports,
      });
      // Attach reference to the platform transfer; the System Program ignores
      // extra read-only keys but the runtime records them on the tx so the
      // server can find this tx via getSignaturesForAddress(reference).
      platformIx.keys.push({ pubkey: referenceKey, isSigner: false, isWritable: false });

      const tx = new Transaction();
      tx.add(creatorIx);
      tx.add(platformIx);
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
      writePending({ reference, signature });

      // 4. Tell the server about the signature for fast confirmation
      toast.info("Confirming on-chain…");
      const ok = await confirmReference(reference, signature);
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
      <div className="overflow-hidden rounded-xl border border-border bg-tint-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
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
          <PromptText text={props.promptText} className="p-4" />
        ) : (
          <div className="relative min-h-36 p-4">
            <pre className="blur-prompt whitespace-pre-wrap break-words font-prompt text-[14px] leading-relaxed text-muted-foreground">
              {"A majestic lion standing on a cliff at golden hour, ultra detailed, cinematic lighting, 8k resolution, hyper realistic, --ar 16:9 --style raw --v 6"}
            </pre>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-900/85 px-3.5 py-1.5 text-xs text-zinc-100 backdrop-blur">
                <Lock className="h-3.5 w-3.5" />
                {props.priceSol === 0
                  ? t("detail.signInToUnlock")
                  : `${t("detail.unlockFor")} ${formatSol(props.priceSol)} SOL${priceUsd ? ` · ${priceUsd}` : ""}`}
              </div>
            </div>
          </div>
        )}

        {/* Preview meta — visible regardless of access; tells the buyer what
            they're about to unlock without leaking the prompt text itself. */}
        {props.analysis && (
          <div className="flex flex-wrap gap-1.5 border-t border-border bg-tint-1 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-tint-1 px-2 py-0.5 tabular-nums">
              <Type className="h-3 w-3" />
              {props.analysis.words} words · {props.analysis.chars} chars
            </span>
            {props.analysis.placeholderCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-violet-300 tabular-nums">
                <SparklesIcon className="h-3 w-3" />
                {props.analysis.placeholderCount} customizable
              </span>
            )}
            {props.analysis.parameters.map((p) => (
              <span
                key={p.flag}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-tint-2 px-2 py-0.5 font-mono text-[10.5px] text-foreground/85"
                title="Detected model parameter"
              >
                <Hash className="h-3 w-3 opacity-60" />
                {p.flag}
                {p.value && <span className="opacity-70">&nbsp;{p.value}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {!props.hasAccess && !props.isOwnPrompt && props.priceSol > 0 && (
        <div className="rounded-xl border border-border bg-tint-1 p-3">
          {appliedPromo ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                <Tag className="h-3 w-3" />
                <span className="font-mono uppercase">{appliedPromo.code}</span>
                <span>· {appliedPromo.discount_percent}% off</span>
              </span>
              <button
                type="button"
                onClick={clearPromo}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> remove
              </button>
            </div>
          ) : promoOpen ? (
            <div className="flex items-center gap-2">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                className="h-8 flex-1 rounded-md border border-border bg-tint-2 px-2.5 font-mono text-xs uppercase tracking-wider outline-none focus:border-violet-400/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPromo();
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={applyPromo}
                disabled={applyingPromo || !promoInput.trim()}
                className="h-8"
              >
                {applyingPromo ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPromoOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Tag className="h-3 w-3" />
              Have a promo code?
            </button>
          )}
        </div>
      )}

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
          ) : appliedPromo ? (
            <>
              {t("detail.buyFor")} {formatSol(effectivePriceSol)} SOL
              {effectivePriceUsd && <span className="opacity-70">· {effectivePriceUsd}</span>}
              <span className="ml-1.5 text-xs line-through opacity-50">
                {formatSol(props.priceSol)}
              </span>
            </>
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
