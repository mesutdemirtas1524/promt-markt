"use client";

import { formatSol, formatUsd } from "@/lib/utils";
import { useSolPrice } from "@/hooks/use-sol-price";
import { SolLogo } from "./sol-logo";

/**
 * USD-first price display. Pass `usd` (the source-of-truth price set by
 * the creator). The SOL equivalent is computed from the live SOL/USD
 * rate and shown as a smaller, muted suffix.
 *
 * Legacy callers can still pass `sol` and we'll convert the other way
 * for them — useful in spots that haven't migrated yet (tips,
 * earnings rolling totals, etc.).
 */
export function PriceTag({
  usd,
  sol,
  size = "sm",
  className = "",
  hideSecondary = false,
}: {
  usd?: number | null;
  sol?: number | null;
  size?: "xs" | "sm" | "base" | "lg";
  className?: string;
  hideSecondary?: boolean;
}) {
  const { usd: solUsd } = useSolPrice();

  const usdValue = resolveUsd(usd, sol, solUsd);
  const solValue = resolveSol(usd, sol, solUsd);

  const solIsFreeOrUnset = sol === undefined || sol === null || sol <= 0;
  if (usdValue !== null && usdValue <= 0 && solIsFreeOrUnset) {
    return <span className={className}>Free</span>;
  }

  const primarySize =
    size === "xs" ? "text-xs" : size === "base" ? "text-base" : size === "lg" ? "text-lg" : "text-sm";
  const secondarySize = size === "lg" ? "text-sm" : size === "base" ? "text-xs" : "text-[10px]";

  const iconSize =
    size === "lg" ? "h-3 w-3" : size === "base" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={primarySize + " font-semibold tabular-nums inline-flex items-baseline gap-1"}>
        {usdValue !== null ? (
          formatUsd(usdValue)
        ) : (
          <span className="inline-flex items-center gap-1">
            <SolLogo className={iconSize} />
            {formatSol(solValue ?? 0)} SOL
          </span>
        )}
      </span>
      {!hideSecondary && solValue !== null && solValue > 0 && usdValue !== null && (
        <span className={`${secondarySize} opacity-70 tabular-nums inline-flex items-center gap-1`}>
          ≈ <SolLogo className={iconSize} /> {formatSol(solValue)} SOL
        </span>
      )}
    </span>
  );
}

function resolveUsd(
  usd: number | null | undefined,
  sol: number | null | undefined,
  solUsd: number | null
): number | null {
  if (typeof usd === "number") return usd;
  if (typeof sol === "number" && solUsd) return sol * solUsd;
  if (typeof sol === "number" && sol === 0) return 0;
  return null;
}

function resolveSol(
  usd: number | null | undefined,
  sol: number | null | undefined,
  solUsd: number | null
): number | null {
  if (typeof sol === "number") return sol;
  if (typeof usd === "number" && solUsd) return usd / solUsd;
  return null;
}
