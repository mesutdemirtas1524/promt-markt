import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSol(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (n === 0) return "Free";
  if (n < 0.001) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  return n.toFixed(3);
}

/**
 * Format a USD amount: "Free" for 0, "$X.YZ" otherwise. Falls back to
 * "$0.00" for null/undefined so we always render something.
 */
export function formatUsd(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return "Free";
  if (n < 1) return `$${n.toFixed(2)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  if (n < 1000) return `$${n.toFixed(0)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatRating(avg: number | null | undefined, count: number | null | undefined): string {
  if (!count || count === 0) return "No ratings";
  const n = typeof avg === "string" ? parseFloat(avg) : avg ?? 0;
  return `${Math.round(n)} / 100 (${count})`;
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
}

export function shortAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function generateUsernameFromEmail(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = Math.floor(Math.random() * 10000).toString();
  return `${base}${suffix}`.slice(0, 24);
}
