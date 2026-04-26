"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Fire-and-forget view ping. Sent once per mount; the server-side
 * unique index handles dedup so multiple tab opens don't inflate.
 */
export function ViewTracker({ promptId }: { promptId: string }) {
  const { authenticated, getAccessToken } = usePrivy();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authenticated) {
          const token = await getAccessToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        if (cancelled) return;
        await fetch("/api/prompts/view", {
          method: "POST",
          headers,
          body: JSON.stringify({ prompt_id: promptId }),
          keepalive: true,
        });
      } catch {
        // Best-effort; never surface to the user
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [promptId, authenticated, getAccessToken]);

  return null;
}
