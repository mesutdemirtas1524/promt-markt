"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, X, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type Reason = "spam" | "copyright" | "nsfw" | "misleading" | "other";

type Report = {
  id: string;
  reason: Reason;
  message: string | null;
  status: "open" | "removed" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
  reporter: { username: string; display_name: string | null } | null;
  prompt: {
    id: string;
    title: string;
    status: string;
    creator: { username: string; display_name: string | null } | null;
    images: { image_url: string; position: number }[];
  } | null;
};

const TABS: { value: "open" | "all" | "removed" | "dismissed"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "removed", label: "Removed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const REASON_LABEL: Record<Reason, string> = {
  spam: "Spam / low quality",
  copyright: "Copyright",
  nsfw: "NSFW / harmful",
  misleading: "Misleading",
  other: "Other",
};

export function ReportsQueue() {
  const { getAccessToken } = usePrivy();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("open");
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/reports?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { items: Report[] };
      setItems(data.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, action: "remove" | "dismiss") {
    setBusyId(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/reports/${id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(action === "remove" ? "Prompt removed." : "Dismissed.");
      // Optimistically drop from current view
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={
              "relative px-4 py-2.5 text-sm tracking-tight transition-colors " +
              (tab === t.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
            {tab === t.value && (
              <span className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
            )}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center text-sm text-muted-foreground">
          No reports in this tab.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const cover = (r.prompt?.images ?? [])
              .sort((a, b) => a.position - b.position)
              .at(0)?.image_url;
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row"
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="h-28 w-28 shrink-0 rounded-lg object-cover ring-1 ring-border"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
                      {REASON_LABEL[r.reason]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(r.created_at)}
                    </span>
                    {r.status !== "open" && (
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (r.status === "removed"
                            ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                            : "border border-border bg-tint-2 text-muted-foreground")
                        }
                      >
                        {r.status}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-medium tracking-tight">
                    {r.prompt ? (
                      <Link
                        href={`/prompt/${r.prompt.id}`}
                        target="_blank"
                        className="hover:underline"
                      >
                        {r.prompt.title}
                        <ExternalLink className="ml-1 inline h-3 w-3 opacity-60" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">[deleted prompt]</span>
                    )}
                  </h3>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    By{" "}
                    <span className="text-foreground">
                      @{r.prompt?.creator?.username ?? "unknown"}
                    </span>{" "}
                    · Reported by{" "}
                    <span className="text-foreground">
                      @{r.reporter?.username ?? "unknown"}
                    </span>
                  </p>
                  {r.message && (
                    <p className="mt-2 rounded-md border border-border bg-tint-1 p-2 text-[12px] text-muted-foreground">
                      &ldquo;{r.message}&rdquo;
                    </p>
                  )}

                  {r.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => resolve(r.id, "remove")}
                        className="gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove prompt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => resolve(r.id, "dismiss")}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                      {busyId === r.id && (
                        <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
