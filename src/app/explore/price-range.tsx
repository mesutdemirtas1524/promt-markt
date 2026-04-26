"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

type SP = {
  sort?: string;
  price?: string;
  category?: string;
  platform?: string;
  q?: string;
};

/**
 * Two-input price range filter. Lives next to the search input on
 * /explore. Empty inputs = no constraint. Submits as ?min=&max=
 * search params alongside whatever else is in the URL.
 */
export function PriceRangeFilter({
  initialMin,
  initialMax,
  preserve,
}: {
  initialMin?: string;
  initialMax?: string;
  preserve: SP;
}) {
  const router = useRouter();
  const [min, setMin] = useState(initialMin ?? "");
  const [max, setMax] = useState(initialMax ?? "");

  // Reset local state if URL changes externally
  useEffect(() => {
    setMin(initialMin ?? "");
    setMax(initialMax ?? "");
  }, [initialMin, initialMax]);

  function submit(nextMin: string, nextMax: string) {
    const params = new URLSearchParams();
    if (preserve.sort) params.set("sort", preserve.sort);
    if (preserve.price) params.set("price", preserve.price);
    if (preserve.category) params.set("category", preserve.category);
    if (preserve.platform) params.set("platform", preserve.platform);
    if (preserve.q) params.set("q", preserve.q);
    const minN = parseFloat(nextMin);
    const maxN = parseFloat(nextMax);
    if (Number.isFinite(minN) && minN > 0) params.set("min", String(minN));
    if (Number.isFinite(maxN) && maxN > 0) params.set("max", String(maxN));
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  const active = (min && parseFloat(min) > 0) || (max && parseFloat(max) > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(min, max);
      }}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-tint-1 px-2 py-1.5 text-xs"
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SOL</span>
      <input
        type="number"
        min="0"
        max="10"
        step="0.001"
        placeholder="min"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-16 bg-transparent text-xs tabular-nums focus:outline-none placeholder:text-muted-foreground/60"
      />
      <span className="text-muted-foreground">→</span>
      <input
        type="number"
        min="0"
        max="10"
        step="0.001"
        placeholder="max"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-16 bg-transparent text-xs tabular-nums focus:outline-none placeholder:text-muted-foreground/60"
      />
      {active ? (
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            submit("", "");
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear price range"
        >
          <X className="h-3 w-3" />
        </button>
      ) : (
        <button
          type="submit"
          className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background hover:opacity-90"
        >
          Apply
        </button>
      )}
    </form>
  );
}
