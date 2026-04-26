"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Render a relative time string ("5m ago", "2d ago"…) without tripping
 * React's hydration mismatch. The first paint matches the server's
 * output, then we update to the live relative value once mounted.
 *
 * `suppressHydrationWarning` is belt-and-braces for the case where
 * server-render and first client-render somehow disagree (eg the SSR
 * timestamp ticks across a bucket boundary in the milliseconds it
 * takes the page to ship).
 */
export function TimeAgo({
  iso,
  className = "",
}: {
  iso: string | Date;
  className?: string;
}) {
  const initial = typeof window === "undefined" ? formatRelativeTime(iso) : formatRelativeTime(iso);
  const [text, setText] = useState(initial);

  useEffect(() => {
    setText(formatRelativeTime(iso));
    // Refresh once a minute so "5m ago" doesn't get stuck on a long-open tab.
    const id = setInterval(() => setText(formatRelativeTime(iso)), 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
