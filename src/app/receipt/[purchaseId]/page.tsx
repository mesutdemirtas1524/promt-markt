import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { formatSol, shortAddress } from "@/lib/utils";
import { TimeAgo } from "@/components/time-ago";
import { SOLANA_NETWORK } from "@/lib/constants";
import { SolLogo } from "@/components/sol-logo";

export const dynamic = "force-dynamic";

type ReceiptRow = {
  id: string;
  created_at: string;
  price_paid_sol: number;
  tx_signature: string | null;
  buyer: { username: string; display_name: string | null; wallet_address: string | null } | null;
  prompt: {
    id: string;
    title: string;
    creator: { username: string; display_name: string | null } | null;
    images: { image_url: string; position: number }[];
  } | null;
};

async function loadReceipt(id: string): Promise<ReceiptRow | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("purchases")
    .select(
      `
      id, created_at, price_paid_sol, tx_signature,
      buyer:users!buyer_id ( username, display_name, wallet_address ),
      prompt:prompts!prompt_id (
        id, title,
        creator:users!creator_id ( username, display_name ),
        images:prompt_images ( image_url, position )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  // Supabase returns related rows as either object or array depending on FK
  const buyer = Array.isArray(data.buyer) ? data.buyer[0] : data.buyer;
  const prompt = Array.isArray(data.prompt) ? data.prompt[0] : data.prompt;
  const promptCreator = prompt
    ? Array.isArray(prompt.creator)
      ? prompt.creator[0]
      : prompt.creator
    : null;
  return {
    id: data.id,
    created_at: data.created_at,
    price_paid_sol: Number(data.price_paid_sol),
    tx_signature: data.tx_signature,
    buyer: buyer
      ? {
          username: buyer.username,
          display_name: buyer.display_name,
          wallet_address: buyer.wallet_address,
        }
      : null,
    prompt: prompt
      ? {
          id: prompt.id,
          title: prompt.title,
          creator: promptCreator
            ? { username: promptCreator.username, display_name: promptCreator.display_name }
            : null,
          images: prompt.images ?? [],
        }
      : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}): Promise<Metadata> {
  const { purchaseId } = await params;
  const r = await loadReceipt(purchaseId);
  if (!r || !r.prompt) return { title: "Receipt" };
  const cover = (r.prompt.images ?? []).sort((a, b) => a.position - b.position)[0]?.image_url;
  const buyerName = r.buyer?.display_name ?? `@${r.buyer?.username ?? "unknown"}`;
  const title = `${buyerName} owns "${r.prompt.title}"`;
  const description = `Verified on-chain purchase on Promt Markt — ${formatSol(r.price_paid_sol)} SOL`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: cover ? [{ url: cover, alt: r.prompt.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: cover ? [cover] : undefined },
  };
}

function explorerTxUrl(sig: string) {
  const cluster = SOLANA_NETWORK === "mainnet-beta" ? "" : `?cluster=${SOLANA_NETWORK}`;
  return `https://solscan.io/tx/${sig}${cluster}`;
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params;
  const r = await loadReceipt(purchaseId);
  if (!r || !r.prompt) notFound();

  const cover = (r.prompt.images ?? []).sort((a, b) => a.position - b.position)[0]?.image_url;
  const buyerName = r.buyer?.display_name ?? `@${r.buyer?.username ?? "unknown"}`;
  const creatorName =
    r.prompt.creator?.display_name ?? `@${r.prompt.creator?.username ?? "unknown"}`;
  const wallet = r.buyer?.wallet_address ?? "";

  return (
    <div className="w-full px-4 py-12 sm:px-6 lg:px-10 xl:px-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(167, 139, 250, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(244, 114, 182, 0.10), transparent 60%)",
          }}
        />
        <div className="relative p-7 sm:p-9">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified on-chain
          </div>

          <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
            <span className="text-gradient-violet">{buyerName}</span> unlocked
          </h1>
          <Link href={`/prompt/${r.prompt.id}`} className="mt-1 block hover:underline">
            <h2 className="text-xl font-medium tracking-tight md:text-2xl">{r.prompt.title}</h2>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            by{" "}
            {r.prompt.creator?.username ? (
              <Link
                href={`/u/${r.prompt.creator.username}`}
                className="text-foreground hover:underline"
              >
                {creatorName}
              </Link>
            ) : (
              creatorName
            )}{" "}
            · <TimeAgo iso={r.created_at} />
          </p>

          {cover && (
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={r.prompt.title}
                className="block h-auto w-full"
                loading="eager"
              />
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Paid">
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                <SolLogo className="h-3.5 w-3.5" />
                {formatSol(r.price_paid_sol)} SOL
              </span>
            </Field>
            <Field label="Buyer wallet">
              {wallet ? (
                <span className="font-mono text-xs">{shortAddress(wallet, 8)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </Field>
          </div>

          {r.tx_signature && (
            <div className="mt-3">
              <Field label="Transaction">
                <a
                  href={explorerTxUrl(r.tx_signature)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-violet-300 hover:underline"
                >
                  {shortAddress(r.tx_signature, 8)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Field>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <ShareButton
              title={`${buyerName} unlocked "${r.prompt.title}" on Promt Markt`}
              text={`Verified on-chain purchase: ${formatSol(r.price_paid_sol)} SOL`}
            />
            <Link href={`/prompt/${r.prompt.id}`}>
              <Button variant="outline" className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                See the prompt
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
        This receipt is generated from on-chain data and is permanently verifiable via the
        Solana explorer link above.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-tint-1 p-3">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
