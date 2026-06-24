import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Single source of truth for admin form inputs (was duplicated as `INPUT`/`SETTING_INPUT`). */
export const inputClass =
  "w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold";

/** Labelled form control with optional hint / error, on the unified grid. */
export function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">
          {label}
          {required && <span className="text-gold"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-[11px] font-semibold text-live">{error}</span>
      ) : (
        hint && <span className="text-[11px] text-faint">{hint}</span>
      )}
    </label>
  );
}
