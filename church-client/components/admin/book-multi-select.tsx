"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeBook } from "@/lib/constants/bible";

/**
 * Combobox multi-select with integrated search — the admin types a Bible book,
 * toggles it, and the selection appears as refined gold badges. No external
 * dependency (built on native elements) so it stays light under Turbopack.
 */
export function BookMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Rechercher un livre…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalizeBook(query);
    if (!q) return options;
    return options.filter((b) => normalizeBook(b).includes(q));
  }, [options, query]);

  const toggle = (book: string) =>
    onChange(value.includes(book) ? value.filter((b) => b !== book) : [...value, book]);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-[#faf8f4] px-3.5 py-2.5 text-left text-[14px] transition",
          open ? "border-gold" : "border-[rgba(40,25,80,0.12)] hover:border-gold/60"
        )}
      >
        <span className={cn("truncate", value.length ? "text-indigo" : "text-faint")}>
          {value.length ? `${value.length} livre${value.length > 1 ? "s" : ""} sélectionné${value.length > 1 ? "s" : ""}` : placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-faint transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)] bg-white shadow-[0_18px_46px_rgba(22,15,51,0.16)]">
          <div className="flex items-center gap-2 border-b border-[rgba(40,25,80,0.08)] px-3 py-2">
            <Search className="size-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-[13px] text-indigo outline-none placeholder:text-faint"
            />
          </div>
          <ul id={listId} role="listbox" aria-multiselectable className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-center text-xs text-faint italic">Aucun livre trouvé.</li>
            ) : (
              filtered.map((book) => {
                const selected = value.includes(book);
                return (
                  <li key={book}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggle(book)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition hover:bg-cream",
                        selected ? "font-bold text-gold-dark" : "text-body"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border transition",
                          selected ? "border-gold bg-gold text-white" : "border-[rgba(40,25,80,0.25)]"
                        )}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      {book}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((book) => (
            <span
              key={book}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[12px] font-bold text-gold-dark"
            >
              <BookOpen className="size-3" />
              {book}
              <button
                type="button"
                onClick={() => toggle(book)}
                aria-label={`Retirer ${book}`}
                className="ml-0.5 cursor-pointer rounded-full text-gold-dark/70 transition hover:text-live"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
