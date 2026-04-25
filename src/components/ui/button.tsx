import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_0_0_rgba(0,0,0,0.06)_inset] hover:bg-foreground/90 active:scale-[0.98]",
        primary:
          "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_8px_24px_-12px_rgba(167,139,250,0.5)] hover:from-violet-400 hover:to-violet-600 active:scale-[0.98]",
        destructive:
          "bg-destructive/90 text-destructive-foreground hover:bg-destructive active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-tint-1 active:scale-[0.98]",
        secondary:
          "bg-tint-2 text-foreground border border-border hover:bg-tint-3 active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:bg-tint-2 hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
