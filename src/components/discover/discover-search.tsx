"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

type SP = Record<string, string | undefined>;

/**
 * Big centered search bar used at the top of the home/discover page.
 * Submits a `q` param and preserves any other active filters.
 */
export function DiscoverSearch({
  initialValue,
  preserve,
  placeholder,
}: {
  initialValue: string;
  preserve: SP;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function submit(next: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (k === "q") continue;
      if (v) params.set(k, v);
    }
    if (next.trim()) params.set("q", next.trim());
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="relative w-full"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        placeholder={placeholder ?? "Search prompts, styles, creators…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 w-full rounded-full border border-border bg-tint-1 pl-12 pr-12 text-sm tracking-tight outline-none transition-all placeholder:text-muted-foreground/70 focus:border-violet-400/40 focus:bg-tint-2 focus:ring-2 focus:ring-violet-500/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            submit("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-tint-3 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
