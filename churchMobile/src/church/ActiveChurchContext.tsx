import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMemberships } from '../api/identity';
import { useAuth } from '../auth/AuthContext';
import type { Membership } from '../types';

const ACTIVE_KEY = 'churchapp.activeChurch';
const MEMBERSHIPS_CACHE = 'churchapp.memberships.cache';

type ActiveChurchState = {
  loading: boolean;
  churches: Membership[];
  active: Membership | null;
  setActive: (tenantId: string) => void;
  refresh: () => Promise<void>;
};

const ActiveChurchContext = createContext<ActiveChurchState | undefined>(undefined);

/**
 * The churches the identity follows + which one is currently in focus (CHR-186).
 * Loaded once for the authed area; the active choice is persisted so the app
 * reopens on the same church. Discover/MyChurches call `refresh` after changes.
 */
export function ActiveChurchProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [churches, setChurches] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }
    const list = await getMemberships(token);
    setChurches(list);
    AsyncStorage.setItem(MEMBERSHIPS_CACHE, JSON.stringify(list)).catch(() => {});
    setActiveId(prev => (prev && list.some(c => c.tenant_id === prev) ? prev : list[0]?.tenant_id ?? null));
  }, [token]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Hydrate from the last cache first so the app opens with churches offline.
      const [stored, cached] = await Promise.all([
        AsyncStorage.getItem(ACTIVE_KEY),
        AsyncStorage.getItem(MEMBERSHIPS_CACHE),
      ]);
      if (mounted && cached) {
        try {
          setChurches(JSON.parse(cached) as Membership[]);
        } catch {
          // ignore a corrupt cache
        }
      }
      if (mounted && stored) {
        setActiveId(stored);
      }
      try {
        await refresh();
      } catch {
        // offline / server down — keep the cached list
      }
      if (mounted) {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const setActive = useCallback((tenantId: string) => {
    setActiveId(tenantId);
    AsyncStorage.setItem(ACTIVE_KEY, tenantId).catch(() => {});
  }, []);

  const active = useMemo(() => churches.find(c => c.tenant_id === activeId) ?? null, [churches, activeId]);

  const value = useMemo<ActiveChurchState>(
    () => ({ loading, churches, active, setActive, refresh }),
    [loading, churches, active, setActive, refresh],
  );

  return <ActiveChurchContext.Provider value={value}>{children}</ActiveChurchContext.Provider>;
}

export function useActiveChurch(): ActiveChurchState {
  const ctx = useContext(ActiveChurchContext);
  if (!ctx) {
    throw new Error('useActiveChurch must be used within an ActiveChurchProvider');
  }
  return ctx;
}
