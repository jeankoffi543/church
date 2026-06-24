"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { ActiveFilter, FilterOperator } from "@/components/admin/query-builder";

export type SortDir = "asc" | "desc" | null;

export type Column<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  /** How the cell is rendered. */
  cell: (row: T) => ReactNode;
  /** Value used for sorting (omit for non-sortable columns). */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
  headerClassName?: string;
};

const matchString = (value: string, term: string, op: FilterOperator): boolean => {
  const v = value.toLowerCase();
  const t = term.toLowerCase();
  if (op === "contains") return v.includes(t);
  if (op === "equals") return v === t;
  if (op === "starts_with") return v.startsWith(t);
  if (op === "ends_with") return v.endsWith(t);
  return true;
};

/**
 * Centralises the search + QueryBuilder filter + sort + pagination logic that
 * was re-implemented in every manager (`matchString`, `processedX`, sort
 * handlers). Columns provide the sort accessors; the hook owns the state.
 */
export function useDataTable<T>({
  rows,
  columns,
  searchKeys = [],
  filterAccessors = {},
  matchFilters = {},
  defaultSort,
  initialPerPage = 10,
}: {
  rows: T[];
  columns: Column<T>[];
  /** Fields scanned by the free-text search bar. */
  searchKeys?: ((row: T) => string | null | undefined)[];
  /** Text fields: maps a QueryBuilder field id to a row accessor (uses operators). */
  filterAccessors?: Record<string, (row: T) => string | null | undefined>;
  /** Non-text fields (select, array membership…): custom predicate per field id. */
  matchFilters?: Record<string, (row: T, filter: ActiveFilter) => boolean>;
  /** Applied when no column sort is active (e.g. alphabetical default). */
  defaultSort?: { id: string; dir: "asc" | "desc" };
  initialPerPage?: number;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  const toggleSort = (id: string) => {
    if (sortBy !== id) {
      setSortBy(id);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortBy(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setFilters([]);
    setSearch("");
    setPage(1);
  };

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        if (!searchKeys.some((k) => (k(row) ?? "").toLowerCase().includes(q))) return false;
      }
      for (const f of filters) {
        const custom = matchFilters[f.fieldId];
        if (custom) {
          if (!custom(row, f)) return false;
          continue;
        }
        const acc = filterAccessors[f.fieldId];
        if (!acc || f.value == null || String(f.value).trim() === "") continue;
        if (!matchString(acc(row) ?? "", String(f.value), f.operator)) return false;
      }
      return true;
    });
  }, [rows, search, filters, searchKeys, filterAccessors, matchFilters]);

  const sorted = useMemo(() => {
    const activeId = sortBy ?? defaultSort?.id ?? null;
    const activeDir = sortBy ? sortDir : (defaultSort?.dir ?? null);
    if (!activeId || !activeDir) return filtered;
    const col = columns.find((c) => c.id === activeId);
    if (!col?.sortValue) return filtered;
    const acc = col.sortValue;
    return [...filtered].sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      if (typeof va === "number" && typeof vb === "number") return activeDir === "asc" ? va - vb : vb - va;
      const cmp = String(va).localeCompare(String(vb), "fr", { numeric: true, sensitivity: "base" });
      return activeDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, columns, defaultSort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const view = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  return {
    // filter state (for <DataFilters/>)
    search,
    setSearch,
    filters,
    setFilters,
    resetFilters,
    // sort state (for <DataTable/>)
    sortBy,
    sortDir,
    toggleSort,
    // page state (for <DataTable/> pagination)
    view,
    page: currentPage,
    pageCount,
    total,
    perPage,
    setPage,
    setPerPage,
  };
}
