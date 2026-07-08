"use client";

// PeriodPicker — presets first (the filter every reader reaches for), custom
// range tucked behind a hairline. One control, reused by every KPI screen so
// "this month" means the same thing everywhere.

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { inputClass } from "@/components/admin/ui/field";

export type Period = { from: string; to: string; label: string };

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-first week
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/** Compute the built-in presets relative to "now" — call at render time, not stored. */
export function periodPresets(now: Date = new Date()): Period[] {
  const today = toIso(now);
  const weekStart = toIso(startOfWeek(now));
  const monthStart = toIso(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = toIso(new Date(now.getFullYear(), 0, 1));

  return [
    { from: today, to: today, label: "Aujourd'hui" },
    { from: weekStart, to: today, label: "Cette semaine" },
    { from: monthStart, to: today, label: "Ce mois" },
    { from: yearStart, to: today, label: "Cette année" },
  ];
}

export function PeriodPicker({
  value,
  onChange,
  className,
}: {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);
  const presets = periodPresets();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isPreset = (p: Period) => p.from === value.from && p.to === value.to;

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange({ from: customFrom, to: customTo, label: "Personnalisé" });
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-3.5 py-2.5 text-[13px] font-bold text-body-strong transition hover:border-gold"
      >
        <Calendar className="size-4 text-gold-dark" />
        {value.label}
        <ChevronDown className={cn("size-3.5 text-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-[260px] rounded-xl border border-[rgba(40,25,80,0.1)] bg-white shadow-xl shadow-indigo/10">
          <ul className="py-1.5">
            {presets.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-[13px] font-semibold text-body-strong transition hover:bg-cream"
                >
                  {p.label}
                  {isPreset(p) && <Check className="size-4 text-gold-dark" strokeWidth={3} />}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-[rgba(40,25,80,0.08)] p-3.5">
            <span className="mb-2 block text-[11px] font-bold tracking-wide text-faint uppercase">
              Période personnalisée
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={cn(inputClass, "py-1.5 text-[12px]")}
              />
              <span className="text-faint">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={cn(inputClass, "py-1.5 text-[12px]")}
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="mt-2.5 w-full rounded-lg bg-gradient-to-br from-gold to-gold-dark py-1.5 text-[12px] font-bold text-indigo transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
