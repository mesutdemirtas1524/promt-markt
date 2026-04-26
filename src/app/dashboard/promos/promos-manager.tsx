"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Loader2, Tag, Copy, Check, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PromoRow = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export function PromosManager({ initialPromos }: { initialPromos: PromoRow[] }) {
  const { getAccessToken } = usePrivy();
  const [promos, setPromos] = useState<PromoRow[]>(initialPromos);

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCreating(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/promos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: code.trim(),
          discount_percent: discount,
          max_uses: maxUses.trim() ? Number(maxUses) : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setPromos((p) => [data.promo, ...p]);
      setCode("");
      setMaxUses("");
      setExpiresAt("");
      toast.success("Promo code created");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    const token = await getAccessToken();
    const res = await fetch("/api/promos/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, active: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Failed");
      return;
    }
    setPromos((rows) => rows.map((r) => (r.id === id ? { ...r, active: next } : r)));
    toast.success(next ? "Activated" : "Disabled");
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createPromo}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-sm font-semibold tracking-tight">New promo code</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Codes are case-insensitive and globally unique across the marketplace.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Code
            </span>
            <input
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
              }
              placeholder="LAUNCH25"
              maxLength={24}
              className="h-9 w-full rounded-md border border-border bg-tint-2 px-2.5 font-mono text-sm uppercase tracking-wider outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Discount %
            </span>
            <input
              required
              type="number"
              min={1}
              max={50}
              value={discount}
              onChange={(e) => setDiscount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="h-9 w-full rounded-md border border-border bg-tint-2 px-2.5 text-sm tabular-nums outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Max uses
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="∞"
              className="h-9 w-full rounded-md border border-border bg-tint-2 px-2.5 text-sm tabular-nums outline-none focus:border-violet-400/50"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Expires (optional)
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-9 rounded-md border border-border bg-tint-2 px-2.5 text-sm outline-none focus:border-violet-400/50"
            />
          </label>
          <Button type="submit" variant="primary" disabled={creating || !code.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create code"}
          </Button>
        </div>
      </form>

      {promos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-12 text-center text-sm text-muted-foreground">
          You haven't created any promo codes yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tint-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Code</th>
                  <th className="px-4 py-2 text-right font-medium">Discount</th>
                  <th className="px-4 py-2 text-right font-medium">Uses</th>
                  <th className="px-4 py-2 text-right font-medium">Expires</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => copy(p.code)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-tint-1 px-2 py-1 font-mono text-xs uppercase tracking-wider hover:bg-tint-2"
                        title="Copy code"
                      >
                        <Tag className="h-3 w-3" />
                        {p.code}
                        {copied === p.code ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.discount_percent}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {p.uses} / {p.max_uses ?? "∞"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {p.expires_at
                        ? new Date(p.expires_at).toLocaleDateString()
                        : "never"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
                          (p.active
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                            : "border-border bg-tint-1 text-muted-foreground")
                        }
                      >
                        {p.active ? "Active" : "Off"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleActive(p.id, !p.active)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-tint-2 hover:text-foreground"
                        title={p.active ? "Disable" : "Enable"}
                      >
                        <Power className="h-3 w-3" />
                        {p.active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
