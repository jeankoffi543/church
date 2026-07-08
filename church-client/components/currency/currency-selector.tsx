"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CurrencySelector — dropdown displayed next to the cart icon in the Navbar.
// Shows flag + code for each active currency and updates the global context.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/currency-context";
import { currencyFlag, type Currency } from "@/lib/currency";

export function CurrencySelector({ className }: { className?: string }) {
  const { currencies, selected, setSelected, loading } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading || currencies.length <= 1) return null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        id="currency-selector-trigger"
        aria-label="Changer de devise"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-[9px] border border-[rgba(40,25,80,0.12)]",
          "bg-white/60 px-2.5 py-1.5 text-[12px] font-bold text-body-strong",
          "transition-all duration-150 hover:bg-white/90 hover:border-[rgba(40,25,80,0.25)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/40"
        )}
      >
        <span className="text-[14px] leading-none">
          {selected ? currencyFlag(selected.code) : "💱"}
        </span>
        <span className="tracking-wide">
          {selected?.code ?? "—"}
        </span>
        <ChevronDown
          className={cn(
            "size-3 text-body/60 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Devises disponibles"
          className={cn(
            "absolute right-0 top-[calc(100%+6px)] z-[200] min-w-[150px]",
            "rounded-xl border border-[rgba(40,25,80,0.10)] bg-white shadow-xl shadow-indigo/5",
            "animate-in fade-in slide-in-from-top-2 duration-150"
          )}
        >
          <div className="py-1.5">
            {currencies.map((currency: Currency) => {
              const isActive = selected?.code === currency.code;
              return (
                <button
                  key={currency.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelected(currency);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors",
                    "hover:bg-cream focus-visible:outline-none focus-visible:bg-cream",
                    isActive
                      ? "font-bold text-indigo bg-cream/70"
                      : "font-medium text-body-strong"
                  )}
                >
                  <span className="text-[15px]">{currencyFlag(currency.code)}</span>
                  <span className="flex-1 text-left">{currency.code}</span>
                  <span className="text-[11px] text-body/60 font-normal">
                    {currency.symbol}
                  </span>
                  {isActive && (
                    <span className="size-1.5 rounded-full bg-gold-dark" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
