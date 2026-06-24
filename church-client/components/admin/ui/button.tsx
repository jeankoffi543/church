"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] hover:-translate-y-0.5 hover:brightness-105",
  secondary: "border border-[rgba(40,25,80,0.12)] bg-white text-body hover:bg-cream",
  ghost: "text-body hover:bg-cream",
  destructive: "bg-live text-white hover:brightness-110",
};

const SIZES = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
} as const;

/**
 * The single admin action button. Variants encode importance (one `primary`
 * per screen; `destructive` is always paired with a confirmation upstream).
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
