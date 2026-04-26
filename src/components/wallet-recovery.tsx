"use client";

import { usePrivy, useSetWalletRecovery } from "@privy-io/react-auth";
import { useExportWallet as useExportSolanaWallet } from "@privy-io/react-auth/solana";
import { Button } from "./ui/button";
import { ShieldCheck, ShieldAlert, Key, ExternalLink } from "lucide-react";
import { useMemo } from "react";

const EMBEDDED_CLIENT_TYPES = new Set(["privy", "privy-v2"]);

type Props = {
  /** "card" = full settings card, "banner" = thin top-of-page warning */
  variant?: "card" | "banner";
};

/**
 * Privy embedded-wallet recovery status + actions.
 *
 * Privy's default recovery for embedded wallets is the user's social
 * login (Google, etc.). If the user loses that login, the wallet — and
 * any SOL inside it — is unrecoverable. This component prompts the user
 * to set a backup recovery method (passcode / Google Drive / iCloud) and
 * lets them export the private key as a final fallback.
 *
 * For users who connected an external wallet (Phantom, Solflare, etc.)
 * the component renders nothing — recovery is the wallet's own concern.
 */
export function WalletRecovery({ variant = "card" }: Props) {
  const { user, ready } = usePrivy();
  const { setWalletRecovery } = useSetWalletRecovery();
  // Default useExportWallet from @privy-io/react-auth is Ethereum-only;
  // our embedded wallets are Solana, so use the Solana-specific export.
  const { exportWallet } = useExportSolanaWallet();

  const embedded = useMemo(() => {
    if (!user?.linkedAccounts) return null;
    for (const acc of user.linkedAccounts) {
      if (acc.type !== "wallet") continue;
      if (acc.walletClientType && EMBEDDED_CLIENT_TYPES.has(acc.walletClientType)) {
        return acc;
      }
    }
    return null;
  }, [user]);

  if (!ready || !embedded) return null;

  // 'privy' (or undefined) = only social-login recovery → at risk
  // anything else = explicit backup configured → protected
  const recoveryMethod = embedded.recoveryMethod;
  const isProtected = Boolean(recoveryMethod) && recoveryMethod !== "privy";

  if (variant === "banner") {
    if (isProtected) return null; // nothing to nag about
    return (
      <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <strong className="text-amber-300">Back up your wallet.</strong>{" "}
            <span className="text-muted-foreground">
              You signed in with a social account — if you lose it, your SOL is gone forever. Set
              a recovery method now, it takes 30 seconds.
            </span>
          </div>
        </div>
        <Button type="button" size="sm" variant="primary" onClick={() => setWalletRecovery()}>
          Set up recovery
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start gap-3">
        {isProtected ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        )}
        <div className="flex-1">
          <h3 className="text-base font-semibold tracking-tight">Wallet & recovery</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isProtected
              ? "You've set a recovery method. If you lose your social login, you can recover this wallet."
              : "Right now your wallet can ONLY be recovered through your social login. If you lose access to that account, your SOL is unrecoverable."}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-tint-1 px-2.5 py-1 font-mono text-[10.5px] tracking-tight text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isProtected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {isProtected ? `Recovery: ${recoveryMethod}` : "Recovery: social login only"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={isProtected ? "outline" : "primary"}
          onClick={() => setWalletRecovery()}
          className="gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isProtected ? "Change recovery method" : "Set up recovery"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => exportWallet({ address: embedded.address })}
          className="gap-1.5"
        >
          <Key className="h-3.5 w-3.5" />
          Export private key
        </Button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/80">
        Tip: even with recovery set, exporting the private key once and storing it offline (a
        password manager) is the safest belt-and-braces.
      </p>
    </div>
  );
}
