"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: number;
  label: string;
  sublabel?: string;
};

/**
 * Single-choice select with a live search field. Used to assign the chief of a
 * ministry from the list of staff users. Pass `value = null` for "no selection".
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner…",
  emptyLabel = "Aucun résultat.",
  clearable = true,
  clearLabel = "— Aucun —",
  disabled = false,
}: {
  options: SearchableOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const pick = (next: number | null) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-gold",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gold"
        )}
      >
        {selected ? (
          <span className="min-w-0 truncate">
            <span className="font-semibold text-indigo">{selected.label}</span>
            {selected.sublabel && (
              <span className="ml-1.5 text-xs text-faint">{selected.sublabel}</span>
            )}
          </span>
        ) : (
          <span className="text-faint">{placeholder}</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && (
            <X
              className="size-3.5 text-faint transition hover:text-live"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
            />
          )}
          <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[rgba(40,25,80,0.1)] bg-white shadow-[0_12px_40px_rgba(22,15,51,0.14)] animate-fade-up">
          <div className="flex items-center gap-2 border-b border-[rgba(40,25,80,0.08)] px-3 py-2">
            <Search className="size-3.5 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {clearable && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-faint italic transition hover:bg-cream"
              >
                {clearLabel}
              </button>
            )}
            {filtered.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-cream",
                    active && "bg-cream/60"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-indigo">{o.label}</span>
                    {o.sublabel && (
                      <span className="block truncate text-xs text-faint">{o.sublabel}</span>
                    )}
                  </span>
                  {active && <Check className="size-4 shrink-0 text-gold-dark" strokeWidth={3} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-faint">{emptyLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
