"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Mobile-only "Filters" button that slides up a sheet containing the
 * same filter rail used on desktop. The rail itself is rendered by the
 * parent server component and passed in as `children`, so the filter
 * logic stays in one place.
 */
export function DiscoverMobileFilters({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="lg:hidden gap-1.5"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
              <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-tint-2 hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5" onClick={() => setOpen(false)}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
