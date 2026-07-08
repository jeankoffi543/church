"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CurrencyContext — Global state for the selected display currency.
//
// Provides:
//   - `currencies`    : list of all active currencies fetched from the API
//   - `selected`      : the currently active Currency object
//   - `setSelected`   : change the active currency (persists to localStorage)
//   - `format(amount)`: convert + format a pivot amount in the selected currency
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Currency,
  fetchPublicCurrencies,
  formatPrice,
} from "@/lib/currency";

const STORAGE_KEY = "mfm_currency";

interface CurrencyContextValue {
  currencies: Currency[];
  selected: Currency | null;
  setSelected: (currency: Currency) => void;
  /** Convert and format a pivot-currency amount in the selected currency. */
  format: (pivotAmount: number | null | undefined) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Restore the last chosen currency code from localStorage. */
function readStoredCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selected, setSelectedState] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  // Load currencies on mount
  useEffect(() => {
    fetchPublicCurrencies().then((data) => {
      if (data.length === 0) {
        setLoading(false);
        return;
      }
      setCurrencies(data);

      // Restore previously selected currency
      const storedCode = readStoredCode();
      const restored = storedCode
        ? data.find((c) => c.code === storedCode)
        : null;
      const defaultCurrency = data.find((c) => c.is_default) ?? data[0];

      setSelectedState(restored ?? defaultCurrency);
      setLoading(false);
    });
  }, []);

  const setSelected = useCallback((currency: Currency) => {
    setSelectedState(currency);
    try {
      localStorage.setItem(STORAGE_KEY, currency.code);
    } catch {
      // ignore
    }
  }, []);

  const format = useCallback(
    (pivotAmount: number | null | undefined): string => {
      if (pivotAmount == null) return "—";
      if (!selected) {
        // Fallback: XOF display
        return `${new Intl.NumberFormat("fr-FR").format(Math.round(pivotAmount))} F CFA`;
      }
      return formatPrice(pivotAmount, selected);
    },
    [selected]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currencies, selected, setSelected, format, loading }),
    [currencies, selected, setSelected, format, loading]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a <CurrencyProvider>");
  }
  return ctx;
}
