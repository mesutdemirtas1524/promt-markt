"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

type SP = {
  sort?: string;
  price?: string;
  category?: string;
  q?: string;
};

export function ExploreSearchInput({
  initialValue,
  preserve,
}: {
  initialValue: string;
  preserve: SP;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function submit(next: string) {
    const params = new URLSearchParams();
    if (preserve.sort) params.set("sort", preserve.sort);
    if (preserve.price) params.set("price", preserve.price);
    if (preserve.category) params.set("category", preserve.category);
    if (next.trim()) params.set("q", next.trim());
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="relative w-full sm:w-80"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search title or description…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            submit("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
