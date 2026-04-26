"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Flag, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Reason = "spam" | "copyright" | "nsfw" | "misleading" | "other";

const REASONS: { value: Reason; label: string; help: string }[] = [
  { value: "spam", label: "Spam or low quality", help: "Repetitive, generic, or auto-generated junk." },
  { value: "copyright", label: "Copyright / IP", help: "Uses someone else's prompt or imagery without permission." },
  { value: "nsfw", label: "NSFW or harmful", help: "Sexual, violent, or otherwise unsafe content." },
  { value: "misleading", label: "Misleading", help: "Preview images don't reflect what the prompt produces." },
  { value: "other", label: "Other", help: "Something else — describe in the message field." },
];

export function ReportButton({ promptId }: { promptId: string }) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("spam");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function openModal(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) {
      login();
      return;
    }
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/prompts/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: promptId, reason, message: message.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = (await res.json()) as { already?: boolean };
      toast.success(
        data.already ? "You've already reported this. Thanks." : "Report sent — we'll review it."
      );
      setOpen(false);
      setMessage("");
      setReason("spam");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Report this prompt"
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 transition-colors hover:text-red-400"
      >
        <Flag className="h-3 w-3" />
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur"
          onClick={() => !busy && setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Report this prompt</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll review and remove if it breaks the rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-tint-2 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "block w-full rounded-lg border px-3 py-2.5 text-left transition-all",
                      active
                        ? "border-red-400/80 bg-red-500/25 ring-2 ring-red-400/40"
                        : "border-border bg-tint-1 hover:bg-tint-2"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "text-sm font-medium tracking-tight",
                          active && "text-red-100"
                        )}
                      >
                        {r.label}
                      </div>
                      {active && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M2.5 6.5L5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-[11.5px]",
                        active ? "text-red-100/85" : "text-muted-foreground"
                      )}
                    >
                      {r.help}
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="mt-4 mb-1.5 block text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Additional context (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything that helps us review this faster"
              className="w-full rounded-lg border border-input bg-tint-1 px-3 py-2 text-sm focus-visible:border-foreground/30 focus-visible:bg-tint-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-red-500 to-red-600 font-medium text-white shadow-[0_8px_24px_-12px_rgba(239,68,68,0.5)] transition-all hover:from-red-400 hover:to-red-600 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Send report
                </>
              )}
            </button>

            <p className="mt-3 text-[10.5px] leading-snug text-muted-foreground/80">
              Your report is private. Reporters who keep flagging good content may have their
              ability to report restricted.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
