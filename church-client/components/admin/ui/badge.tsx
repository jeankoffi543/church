import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "live" | "upload" | "success" | "warning" | "neutral" | "info";

const TONES: Record<BadgeTone, string> = {
  live: "border-violet-500/40 bg-violet-500/10 text-violet-600 shadow-[0_0_12px_rgba(139,92,246,0.22)]",
  upload: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600",
  success: "border-online/30 bg-online/10 text-online",
  warning: "border-gold/40 bg-gold/10 text-gold-dark",
  neutral: "border-[rgba(40,25,80,0.12)] bg-indigo/5 text-indigo",
  info: "border-indigo/20 bg-indigo/5 text-indigo",
};

/** Unified status pill (replay/upload source, statuses, counts…). */
export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
