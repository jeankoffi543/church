// ─────────────────────────────────────────────────────────────────────────────
// Currency helpers — types, formatting, and client-side API calls.
// All conversion math happens here so it stays out of components.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Currency {
  id: number;
  code: string;   // "XOF" | "USD" | "EUR" | …
  symbol: string; // "F CFA" | "$" | "€" | …
  exchange_rate: number; // relative to pivot (pivot = 1.0)
  is_default: boolean;
  is_active: boolean;
}

/** Emoji flag map for well-known currency codes. */
const FLAG_MAP: Record<string, string> = {
  XOF: "🇨🇮",
  EUR: "🇪🇺",
  USD: "💵",
  GBP: "🇬🇧",
  GHS: "🇬🇭",
  NGN: "🇳🇬",
  XAF: "🇨🇲",
  MAD: "🇲🇦",
  EGP: "🇪🇬",
  ZAR: "🇿🇦",
};

export function currencyFlag(code: string): string {
  return FLAG_MAP[code] ?? "💱";
}

// ── Conversion ─────────────────────────────────────────────────────────────

/**
 * Convert a pivot-currency amount to a target currency.
 * Formula: convertedPrice = pivotAmount × targetExchangeRate
 */
export function convertAmount(
  pivotAmount: number,
  targetRate: number
): number {
  return pivotAmount * targetRate;
}

// ── Formatting ─────────────────────────────────────────────────────────────

/**
 * Format a (already-converted) amount with the currency's symbol.
 * Uses Intl.NumberFormat for locale-aware grouping.
 */
export function formatPrice(amount: number, currency: Currency): string {
  const rounded = Math.round(convertAmount(amount, currency.exchange_rate));

  // XOF and XAF are typically displayed without decimals
  const noDecimals = ["XOF", "XAF", "GHS"].includes(currency.code);

  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  }).format(rounded);

  // Symbol placement: $ before for USD/GBP, after for XOF/EUR/…
  if (["USD", "GBP"].includes(currency.code)) {
    return `${currency.symbol}${formatted}`;
  }
  return `${formatted} ${currency.symbol}`;
}

// ── Public API calls ───────────────────────────────────────────────────────

/** Fetch active currencies from the public API. */
export async function fetchPublicCurrencies(): Promise<Currency[]> {
  try {
    const res = await fetch(`${API_URL}/public/store/currencies`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["currencies"] },
    });
    if (!res.ok) return [];
    const body = await res.json() as { data: Currency[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

// Admin CRUD lives in `lib/admin-api.ts` (server actions via `adminFetch`,
// session-based auth) — see getAdminCurrencies/updateAdminCurrency/setDefaultAdminCurrency.
