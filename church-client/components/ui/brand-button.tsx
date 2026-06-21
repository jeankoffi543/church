import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const brandButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Gold gradient — primary call to action
        gold: "rounded-xl bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.3)] hover:-translate-y-0.5 hover:brightness-105",
        // Deep indigo gradient
        dark: "rounded-xl bg-gradient-to-br from-indigo-mid to-indigo text-white shadow-[0_12px_30px_rgba(33,22,72,0.24)] hover:-translate-y-0.5",
        // Outline on a light background
        outline:
          "rounded-xl border border-indigo-mid/25 bg-transparent text-indigo-mid hover:border-gold",
        // Outline / glass on a dark background
        ghostLight:
          "rounded-xl border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
        // Live red
        live: "rounded-[10px] bg-live text-white shadow-[0_6px_16px_rgba(226,59,59,0.32)] hover:bg-live-dark",
      },
      size: {
        sm: "px-4 py-[11px] text-[13px]",
        md: "px-6 py-[14px] text-[15px]",
        lg: "px-8 py-4 text-base",
        full: "w-full px-6 py-[17px] text-base",
      },
    },
    defaultVariants: {
      variant: "gold",
      size: "md",
    },
  }
);

function BrandButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof brandButtonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="brand-button"
      className={cn(brandButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { BrandButton, brandButtonVariants };
