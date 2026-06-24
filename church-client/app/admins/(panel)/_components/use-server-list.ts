"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AdminListMeta, AdminListParams, AdminListResult } from "@/lib/admin-api";

/** Stable string key for the effect dependency (ignores object identity). */
function serializeParams(params: AdminListParams): string {
  return JSON.stringify({
    page: params.page ?? 1,
    perPage: params.perPage ?? null,
    search: params.search?.trim() ?? "",
    sort: params.sort ?? null,
    filters: params.filters ?? {},
  });
}

/**
 * Drives an admin table from the API (Keky\QueryMaster) instead of filtering in
 * the browser. The owning manager keeps its own search / filter / sort / page
 * state and feeds it in via `params`; this hook debounces changes, refetches the
 * matching server page, and ignores out-of-order responses.
 *
 * The first render is skipped because the server component already provided
 * `initialData`/`initialMeta` for the default params — avoiding a redundant
 * fetch on mount. Call `refresh()` after a mutation to re-sync the page.
 */
export function useServerList<T>({
  fetcher,
  params,
  initialData,
  initialMeta,
  debounceMs = 300,
}: {
  fetcher: (params: AdminListParams) => Promise<AdminListResult<T>>;
  params: AdminListParams;
  initialData: T[];
  initialMeta: AdminListMeta;
  debounceMs?: number;
}) {
  const [items, setItems] = useState<T[]>(initialData);
  const [meta, setMeta] = useState<AdminListMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const isFirstRender = useRef(true);

  // Mirror the latest fetcher + params so `load` stays identity-stable (and
  // safe to call from mutation handlers) without re-subscribing the effect.
  // Refs are written in an effect — never during render.
  const latest = useRef({ fetcher, params });
  useEffect(() => {
    latest.current = { fetcher, params };
  });

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const { fetcher: latestFetcher, params: latestParams } = latest.current;
      const res = await latestFetcher(latestParams);
      if (id === requestId.current) {
        setItems(res.data);
        setMeta(res.meta);
      }
    } catch (err) {
      if (id === requestId.current) {
        setError((err as Error).message || "Erreur de chargement.");
      }
    } finally {
      if (id === requestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const key = serializeParams(params);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(load, debounceMs);
    return () => clearTimeout(timer);
  }, [key, load, debounceMs]);

  return { items, setItems, meta, setMeta, isLoading, error, refresh: load };
}
