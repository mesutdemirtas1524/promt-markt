"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DiscoverSearchParams } from "./discover-filters";

/**
 * Compact min/max USD inputs that submit as ?min=&max= and preserve
 * everything else on the URL. Lives in the discover sidebar (and in
 * the mobile filter sheet) so a single source handles both.
 */
export function DiscoverPriceRange({
  initialMin,
  initialMax,
  preserve,
}: {
  initialMin?: string;
  initialMax?: string;
  preserve: DiscoverSearchParams;
}) {
  const router = useRouter();
  const [min, setMin] = useState(initialMin ?? "");
  const [max, setMax] = useState(initialMax ?? "");

  useEffect(() => {
    setMin(initialMin ?? "");
    setMax(initialMax ?? "");
  }, [initialMin, initialMax]);

  function submit() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (k === "min" || k === "max") continue;
      if (v) params.set(k, v);
    }
    const minN = parseFloat(min);
    const maxN = parseFloat(max);
    if (Number.isFinite(minN) && minN > 0) params.set("min", String(minN));
    if (Number.isFinite(maxN) && maxN > 0) params.set("max", String(maxN));
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function clear() {
    setMin("");
    setMax("");
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (k === "min" || k === "max") continue;
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const active = (min && parseFloat(min) > 0) || (max && parseFloat(max) > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
            $
          </span>
          <input
            type="number"
            min="0"
            max="1000"
            step="0.01"
            placeholder="min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-tint-1 pl-5 pr-2 text-xs tabular-nums outline-none placeholder:text-muted-foreground/60 focus:border-violet-400/40"
          />
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="relative w-full">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
            $
          </span>
          <input
            type="number"
            min="0"
            max="1000"
            step="0.01"
            placeholder="max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-tint-1 pl-5 pr-2 text-xs tabular-nums outline-none placeholder:text-muted-foreground/60 focus:border-violet-400/40"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">USD</span>
        <div className="flex gap-1">
          {active && (
            <button
              type="button"
              onClick={clear}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-tint-2 hover:text-foreground"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </form>
  );
}
