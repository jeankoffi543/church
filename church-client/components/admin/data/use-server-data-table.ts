"use client";

import { useCallback, useMemo, useState } from "react";

import { useServerList } from "@/app/admins/(panel)/_components/use-server-list";
import type { AdminListMeta, AdminListParams, AdminListResult } from "@/lib/admin-api";
import { serializeFiltersForQueryMaster, type ActiveFilter } from "@/components/admin/query-builder";

import type { SortDir } from "./use-data-table";

/**
 * Server-side sibling of {@link useDataTable}: it exposes the **exact same**
 * return shape (so `<DataFilters/>` and `<DataTable/>` stay untouched), but the
 * search / filtering / sorting / pagination run on the API through
 * Keky\QueryMaster instead of in the browser.
 *
 * The owning page seeds `initialData`/`initialMeta`; changes are debounced and
 * refetched. Call `refresh()` after a mutation to re-sync the current page.
 */
export function useServerDataTable<T>({
  fetcher,
  initialData,
  initialMeta,
  /** UI column id → QueryMaster sortable field. `undefined` disables server sort for that id. */
  sortFieldMap = {},
  /** Override how active filters become QueryMaster params (e.g. translate a <select>). */
  buildFilters,
  /** Always-on filters that live outside the QueryBuilder (status tabs, category, …). */
  extraFilters,
  initialPerPage = 10,
  debounceMs = 300,
}: {
  fetcher: (params: AdminListParams) => Promise<AdminListResult<T>>;
  initialData: T[];
  initialMeta: AdminListMeta;
  sortFieldMap?: Record<string, string | undefined>;
  buildFilters?: (filters: ActiveFilter[]) => Record<string, string>;
  extraFilters?: Record<string, string>;
  initialPerPage?: number;
  debounceMs?: number;
}) {
  const [search, setSearchState] = useState("");
  const [filters, setFiltersState] = useState<ActiveFilter[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState(initialPerPage);

  // Any control change returns to page 1 (the server view shifts under us).
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageState(1);
  }, []);
  const setFilters = useCallback((next: ActiveFilter[]) => {
    setFiltersState(next);
    setPageState(1);
  }, []);
  const resetFilters = useCallback(() => {
    setFiltersState([]);
    setSearchState("");
    setPageState(1);
  }, []);
  const setPage = useCallback((next: number) => setPageState(next), []);
  const setPerPage = useCallback((next: number) => {
    setPerPageState(next);
    setPageState(1);
  }, []);

  const toggleSort = useCallback(
    (id: string) => {
      setPageState(1);
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
    },
    [sortBy, sortDir],
  );

  const serverFilters = useMemo(() => {
    const base = buildFilters ? buildFilters(filters) : serializeFiltersForQueryMaster(filters);
    return { ...base, ...(extraFilters ?? {}) };
  }, [filters, buildFilters, extraFilters]);

  const sortField = sortBy ? (sortFieldMap[sortBy] ?? sortBy) : undefined;

  const params: AdminListParams = {
    page,
    perPage,
    search,
    sort: sortField && sortDir ? { field: sortField, dir: sortDir } : null,
    filters: serverFilters,
  };

  const { items, setItems, meta, isLoading, refresh } = useServerList<T>({
    fetcher,
    params,
    initialData,
    initialMeta,
    debounceMs,
  });

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
    // page state (for <DataTable/> pagination), sourced from the server meta
    view: items,
    page: meta.current_page,
    pageCount: Math.max(1, meta.last_page),
    total: meta.total,
    perPage,
    setPage,
    setPerPage,
    // server extras for the owning manager
    setItems,
    refresh,
    isLoading,
  };
}
