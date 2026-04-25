import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default: "bg-tint-2 text-foreground border border-border",
        secondary: "bg-tint-2 text-secondary-foreground border border-border",
        outline: "text-foreground border border-border",
        success: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/20",
        warning: "bg-amber-500/12 text-amber-300 border border-amber-500/20",
        destructive: "bg-red-500/12 text-red-300 border border-red-500/25",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
