"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible section for the discover sidebar. Default collapsed for
 * the long lists (Category, Platform); the parent can pass
 * `defaultOpen` for sections that should always be open (Sort, Price).
 */
export function DiscoverSection({
  title,
  defaultOpen = false,
  collapsible = true,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <div className="space-y-px">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-md py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          {title}
          {typeof badge === "number" && badge > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "rotate-0")}
        />
      </button>
      {open && <div className="space-y-px">{children}</div>}
    </div>
  );
}
