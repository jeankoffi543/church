"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { groupStyle } from "./group-style";

/**
 * Fluid multi-select for assigning a servant to one or more Groups /
 * Departments. Renders selected groups as removable colour chips and exposes a
 * checkbox dropdown of the remaining options.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Sélectionner des départements…",
  disabled = false,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value]
    );
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex min-h-[46px] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3 py-2 text-sm outline-none transition focus-within:border-gold",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {selected.length === 0 && (
          <span className="text-faint">{placeholder}</span>
        )}
        {selected.map((value) => {
          const style = groupStyle(value);
          return (
            <span
              key={value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
                style.bg,
                style.text,
                style.ring
              )}
            >
              <span className={cn("size-1.5 rounded-full", style.dot)} />
              {value}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(value);
                }}
                className="ml-0.5 cursor-pointer rounded-full transition hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        <ChevronDown
          className={cn(
            "pointer-events-none ml-auto size-4 shrink-0 text-faint transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1.5 shadow-[0_12px_40px_rgba(22,15,51,0.14)] animate-fade-up">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-faint">Aucun groupe disponible.</p>
          )}
          {options.map((value) => {
            const active = selected.includes(value);
            const style = groupStyle(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-cream",
                  active && "bg-cream/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[5px] border transition",
                    active
                      ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white"
                      : "border-[rgba(40,25,80,0.2)] bg-white"
                  )}
                >
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn("size-2 rounded-full", style.dot)} />
                <span className="font-semibold text-indigo">{value}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
