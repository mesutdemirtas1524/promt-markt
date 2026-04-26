"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Item = { id: string; image_url: string };
type Update = { id: string; width: number; height: number };

function readDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const timer = setTimeout(() => reject(new Error("timeout")), 10_000);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
      clearTimeout(timer);
      reject(e);
    };
    img.src = url;
  });
}

export function BackfillUI() {
  const { getAccessToken } = usePrivy();
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ processed: 0, failed: 0, remaining: -1 });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function step(token: string): Promise<{ batch: number; remaining: number }> {
    // Fetch a batch
    const listRes = await fetch("/api/admin/backfill-image-dims?limit=20", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
    const { items } = (await listRes.json()) as { items: Item[] };
    if (items.length === 0) return { batch: 0, remaining: 0 };

    // Read dims in parallel
    const updates: Update[] = [];
    let batchFailed = 0;
    await Promise.all(
      items.map(async (it) => {
        try {
          const dims = await readDims(it.image_url);
          if (dims.width > 0 && dims.height > 0) {
            updates.push({ id: it.id, width: dims.width, height: dims.height });
          }
        } catch {
          batchFailed++;
        }
      })
    );

    // Push updates back
    if (updates.length > 0) {
      const upRes = await fetch("/api/admin/backfill-image-dims", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      });
      if (!upRes.ok) throw new Error(`update failed: ${upRes.status}`);
    }
    setStats((s) => ({
      processed: s.processed + updates.length,
      failed: s.failed + batchFailed,
      remaining: s.remaining,
    }));
    return { batch: items.length, remaining: items.length };
  }

  async function run() {
    setError(null);
    setDone(false);
    setRunning(true);
    setStats({ processed: 0, failed: 0, remaining: -1 });
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("auth missing");
      // Loop until the API returns an empty batch
      while (true) {
        const { batch } = await step(token);
        if (batch === 0) break;
      }
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={running} variant="primary">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running…
          </>
        ) : done ? (
          "Run again"
        ) : (
          "Start backfill"
        )}
      </Button>

      <div className="rounded-xl border border-border bg-tint-1 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Processed</span>
          <span className="font-semibold tabular-nums">{stats.processed}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Failed</span>
          <span className="font-semibold tabular-nums">{stats.failed}</span>
        </div>
        {done && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            All done. New cards will use stored dims.
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: this page is admin-only (platform wallet). It runs in your browser, batches of 20,
        until everything has dims. You can close the tab and re-open later — anything missing is
        picked up on the next run.
      </p>
    </div>
  );
}
