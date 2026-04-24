"use client";

import { formatSol } from "@/lib/utils";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";

/**
 * Reusable "0.0012 SOL ($0.18)" pill. Returns "Free" when `sol` is 0.
 * `size` controls font size; USD is always muted/smaller.
 */
export function PriceTag({
  sol,
  size = "sm",
  className = "",
  hideUsd = false,
}: {
  sol: number;
  size?: "xs" | "sm" | "base" | "lg";
  className?: string;
  hideUsd?: boolean;
}) {
  const { usd } = useSolPrice();
  if (sol === 0) return <span className={className}>Free</span>;

  const dollars = solToUsdString(sol, usd);
  const solSize = size === "xs" ? "text-xs" : size === "base" ? "text-base" : size === "lg" ? "text-lg" : "text-sm";
  const usdSize = size === "lg" ? "text-sm" : "text-xs";

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={solSize}>{formatSol(sol)} SOL</span>
      {!hideUsd && dollars && <span className={`${usdSize} opacity-70`}>{dollars}</span>}
    </span>
  );
}
