"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  onChange,
  size = 24,
  readOnly = false,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(i)}
          onMouseLeave={() => !readOnly && setHover(null)}
          onClick={() => !readOnly && onChange?.(i)}
          className={cn("transition-transform", !readOnly && "hover:scale-110 cursor-pointer", readOnly && "cursor-default")}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              i <= active ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}
