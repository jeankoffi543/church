"use client";

import { Search, X } from "lucide-react";

import { QueryBuilder, type ActiveFilter, type FilterField } from "@/components/admin/query-builder";

type AsyncOptions = Record<string, { value: string | number; label: string; sublabel?: string }[]>;

/** Zone ② — the unified search bar + inline filter builder + clear-all chip. */
export function DataFilters({
  search,
  onSearch,
  placeholder = "Rechercher…",
  fields,
  filters,
  onFilters,
  onReset,
  asyncOptions,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  fields: FilterField[];
  filters: ActiveFilter[];
  onFilters: (filters: ActiveFilter[]) => void;
  onReset: () => void;
  asyncOptions?: AsyncOptions;
}) {
  return (
    <div className="relative z-20 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] max-w-md flex-1 items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
          <Search className="size-4 text-faint" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full border-none bg-transparent text-[14px] text-indigo outline-none placeholder:text-faint"
          />
        </div>
        <QueryBuilder fields={fields} activeFilters={filters} onChange={onFilters} asyncOptions={asyncOptions} />
      </div>

      {filters.length > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-live/15 bg-live/5 px-3.5 py-2 text-xs font-semibold text-live transition hover:bg-live/10"
        >
          <X className="size-3.5" /> Effacer les filtres
        </button>
      )}
    </div>
  );
}
