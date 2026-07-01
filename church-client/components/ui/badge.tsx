import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-md font-bold uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-white/8 text-white/70",
        onair: "bg-studio-onair text-white",
        preview: "bg-studio-preview-bright text-ink",
        sandbox: "bg-studio-sandbox text-ink",
        purple: "bg-studio-purple/12 text-studio-purple",
        gold: "bg-gold/12 text-gold",
      },
      size: {
        default: "px-1.5 py-0.5 text-[8px]",
        sm: "px-1.5 py-[3px] text-[9px]",
        md: "px-2 py-1 text-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
