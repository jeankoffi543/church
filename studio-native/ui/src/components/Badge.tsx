import * as React from "react";
import { cn } from "../lib/cn";

// Ported from church-client components/ui/badge.tsx (variant/size maps inlined,
// no class-variance-authority dependency).
const VARIANTS: Record<string, string> = {
  default: "bg-white/8 text-white/70",
  onair: "bg-studio-onair text-white",
  preview: "bg-studio-preview-bright text-ink",
  sandbox: "bg-studio-sandbox text-ink",
  purple: "bg-studio-purple/12 text-studio-purple",
  gold: "bg-gold/12 text-gold",
};
const SIZES: Record<string, string> = {
  default: "px-1.5 py-0.5 text-[8px]",
  sm: "px-1.5 py-[3px] text-[9px]",
  md: "px-2 py-1 text-[10px]",
};

export function Badge({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md font-bold tracking-wide whitespace-nowrap uppercase",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
