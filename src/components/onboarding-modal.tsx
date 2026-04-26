"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "./ui/button";
import { shortAddress } from "@/lib/utils";
import { Wallet, Compass, Upload, Copy, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "pm-onboarded-v1";

/**
 * One-shot welcome modal for first-time signed-in users. Shows once
 * per browser per major version (bump the v in STORAGE_KEY when the
 * onboarding content changes meaningfully).
 *
 * The trigger is intentionally permissive: signed-in + db user loaded
 * + flag absent. We don't try to detect "first session ever" because
 * the localStorage flag already serves that purpose.
 */
export function OnboardingModal() {
  const { dbUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!dbUser) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Brief delay so the user lands first, then the welcome appears
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [dbUser]);

  function close() {
    setOpen(false);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!open || !dbUser) return null;

  const wallet = dbUser.wallet_address;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-tint-2 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/5 px-6 py-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wider text-violet-300">
            <Sparkles className="h-3 w-3" />
            WELCOME
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Welcome to Promt Markt{dbUser.display_name ? `, ${dbUser.display_name}` : ""} 👋
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy and sell AI image prompts paid in Solana. Here&apos;s how to get started.
          </p>
        </div>

        <div className="space-y-3 p-6">
          <Step
            icon={<Wallet className="h-4 w-4 text-violet-300" />}
            title="Your Solana wallet is ready"
            body={
              wallet ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="rounded-md bg-tint-1 px-2 py-1 font-mono text-xs">
                    {shortAddress(wallet, 8)}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet);
                      setCopied(true);
                      toast.success("Address copied");
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-tint-1 px-2 py-1 text-xs hover:bg-tint-2"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Open your wallet menu (top-right) to see your address.
                </p>
              )
            }
          />
          <Step
            icon={<Compass className="h-4 w-4 text-violet-300" />}
            title="Browse the marketplace"
            body={
              <p className="mt-1 text-xs text-muted-foreground">
                Filter by price, platform, or category. Free prompts unlock instantly. Paid
                prompts are paid wallet-to-wallet on Solana — the platform takes 20%, the
                creator gets 80%.
              </p>
            }
          />
          <Step
            icon={<Upload className="h-4 w-4 text-violet-300" />}
            title="Or create your first prompt"
            body={
              <p className="mt-1 text-xs text-muted-foreground">
                Upload your prompt text + 1–6 images that show its result. Set a price (or 0
                for free). Earnings land in your wallet on every sale.
              </p>
            }
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-tint-1 px-6 py-4 sm:flex-row sm:justify-end">
          <Link href="/explore" className="sm:order-1">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={close}>
              Browse prompts
            </Button>
          </Link>
          <Link href="/upload" className="sm:order-2">
            <Button variant="primary" className="w-full sm:w-auto" onClick={close}>
              Create a prompt
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-tint-1 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/10">
          {icon}
        </span>
        {title}
      </div>
      <div className="ml-9">{body}</div>
    </div>
  );
}
