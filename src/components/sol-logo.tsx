import { formatSol } from "@/lib/utils";

/**
 * Solana wordmark glyph — three slanted parallelograms in the official
 * green→pink gradient. Used inline next to SOL amounts so users
 * recognise the chain at a glance.
 *
 * Pure SVG, no client deps; safe in server components and OG images.
 */
export function SolLogo({
  className = "h-3 w-3",
  title = "Solana",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 397.7 311.7"
      className={className}
      aria-label={title}
      role="img"
    >
      <defs>
        <linearGradient
          id="pm-sol-gradient"
          gradientUnits="userSpaceOnUse"
          x1="360.88"
          x2="141.21"
          y1="351.46"
          y2="-69.29"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#pm-sol-gradient)"
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
      />
      <path
        fill="url(#pm-sol-gradient)"
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
      />
      <path
        fill="url(#pm-sol-gradient)"
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
      />
    </svg>
  );
}

/**
 * Render a SOL amount as "[logo] 0.0027 SOL". Logo size scales with the
 * containing text via the className prop. `iconClassName` overrides if
 * the caller wants a different glyph size from the surrounding text.
 */
export function SolAmount({
  amount,
  className = "",
  iconClassName = "h-2.5 w-2.5",
  hideUnit = false,
}: {
  amount: number;
  className?: string;
  iconClassName?: string;
  hideUnit?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <SolLogo className={iconClassName} />
      <span>{formatSol(amount)}</span>
      {!hideUnit && <span className="opacity-80">SOL</span>}
    </span>
  );
}
