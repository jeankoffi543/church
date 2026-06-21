"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const PER_PAGE_OPTIONS = [10, 30, 50, 100] as const;

/**
 * Build the windowed list of page tokens, e.g. `[1, 2, 3, "…", 20, 30]`.
 * Always keeps the first and last page, plus a window around the current one.
 */
function pageTokens(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const tokens: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) tokens.push("ellipsis");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < pageCount - 1) tokens.push("ellipsis");

  tokens.push(pageCount);
  return tokens;
}

export function Pagination({
  page,
  pageCount,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  itemLabel = "éléments",
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  itemLabel?: string;
}) {
  const safePage = Math.min(Math.max(1, page), Math.max(1, pageCount));
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(total, safePage * perPage);

  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), pageCount));

  const arrowBtn =
    "flex size-8 items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] bg-white text-indigo transition hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[rgba(40,25,80,0.1)] disabled:hover:text-indigo";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(40,25,80,0.08)] bg-cream/30 px-6 py-4">
      {/* Range + per-page */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-body">
        <span>
          <span className="font-bold text-indigo">{from}</span>–
          <span className="font-bold text-indigo">{to}</span> sur{" "}
          <span className="font-bold text-indigo">{total}</span> {itemLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-faint">Par page</span>
          <div className="relative">
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="cursor-pointer appearance-none rounded-lg border border-[rgba(40,25,80,0.12)] bg-white py-1.5 pr-7 pl-2.5 text-xs font-bold text-indigo outline-none transition hover:border-gold focus:border-gold"
            >
              {PER_PAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 rotate-90 text-faint" />
          </div>
        </div>
      </div>

      {/* Pager */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => go(1)}
          disabled={safePage <= 1}
          className={arrowBtn}
          aria-label="Première page"
        >
          <ChevronsLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 1}
          className={arrowBtn}
          aria-label="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageTokens(safePage, pageCount).map((token, idx) =>
            token === "ellipsis" ? (
              <span
                key={`e-${idx}`}
                className="flex size-8 items-end justify-center pb-1.5 text-faint"
              >
                …
              </span>
            ) : (
              <button
                key={token}
                type="button"
                onClick={() => go(token)}
                aria-current={token === safePage ? "page" : undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-xs font-bold transition",
                  token === safePage
                    ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-sm"
                    : "border border-[rgba(40,25,80,0.1)] bg-white text-indigo hover:border-gold hover:text-gold-dark"
                )}
              >
                {token}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => go(safePage + 1)}
          disabled={safePage >= pageCount}
          className={arrowBtn}
          aria-label="Page suivante"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => go(pageCount)}
          disabled={safePage >= pageCount}
          className={arrowBtn}
          aria-label="Dernière page"
        >
          <ChevronsRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
