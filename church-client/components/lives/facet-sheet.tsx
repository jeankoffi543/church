"use client";

import { useMemo } from "react";
import { Search, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const STEP = 20;

/**
 * Right-side facet sheet (same mechanism as the médiathèque filters): a
 * searchable, paginated ("Voir plus") list of options that toggle the parent
 * selection. State is lifted so it resets cleanly each time it opens.
 */
export function FacetSheet({
  open,
  onOpenChange,
  title,
  options,
  selected,
  onToggle,
  query,
  limit,
  onQuery,
  onMore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  query: string;
  limit: number;
  onQuery: (value: string) => void;
  onMore: () => void;
}) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const visible = matches.slice(0, limit);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex w-[90vw] flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-[rgba(40,25,80,0.08)] p-5">
          <SheetTitle className="font-display text-xl font-bold text-indigo italic">{title}</SheetTitle>
          <SheetDescription className="text-xs text-body">
            {selected.length > 0 ? `${selected.length} sélectionné(s) · ` : ""}
            Recherchez puis cochez.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-[rgba(40,25,80,0.08)] p-4">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(40,25,80,0.12)] bg-cream px-3 py-2 focus-within:border-gold">
            <Search className="size-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-faint italic">Aucun résultat.</p>
          ) : (
            visible.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggle(opt)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                    checked ? "bg-gold/10 font-bold text-gold-dark" : "text-indigo hover:bg-cream"
                  )}
                >
                  <span className="truncate">{opt}</span>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition",
                      checked ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white" : "border-[rgba(40,25,80,0.2)]"
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })
          )}

          {matches.length > limit && (
            <button
              onClick={onMore}
              className="mt-2 w-full cursor-pointer rounded-lg border border-[rgba(40,25,80,0.12)] py-2 text-[12px] font-bold text-gold-dark transition hover:bg-cream"
            >
              Voir plus ({matches.length - limit})
            </button>
          )}
        </div>

        <div className="border-t border-[rgba(40,25,80,0.08)] p-4">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo shadow-md transition hover:brightness-105"
          >
            Terminé
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const FACET_SHEET_STEP = STEP;
