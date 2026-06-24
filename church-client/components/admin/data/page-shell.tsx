import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Unified page width + rhythm for every admin screen. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1180px] animate-fade-up", className)}>{children}</div>;
}

/** Zone ① — eyebrow · prestige title · subtitle, with right-aligned actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">{eyebrow}</span>
        )}
        <h1 className="mt-1 font-display text-[34px] leading-tight font-semibold text-indigo italic">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-body">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
