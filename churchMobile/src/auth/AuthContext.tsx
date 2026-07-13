import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as identityApi from '../api/identity';
import type { Identity } from '../types';
import { tokenStorage } from './storage';

type AuthState = {
  loading: boolean;
  token: string | null;
  user: Identity | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the identity session (CHR-185): restores a stored token on boot,
 * validates it against /me, and exposes sign-in / sign-up / sign-out. The token
 * is the single source of truth for which navigator (auth vs app) is shown.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Identity | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await tokenStorage.get();
        if (stored) {
          const me = await identityApi.fetchMe(stored);
          if (active) {
            setToken(stored);
            setUser(me);
          }
        }
      } catch {
        await tokenStorage.clear();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback(async (newToken: string, newUser: Identity) => {
    await tokenStorage.set(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token: t, identity } = await identityApi.login(email, password);
      await apply(t, identity);
    },
    [apply],
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; phone?: string; password: string }) => {
      const { token: t, identity } = await identityApi.register(input);
      await apply(t, identity);
    },
    [apply],
  );

  const signOut = useCallback(async () => {
    const current = token;
    setToken(null);
    setUser(null);
    await tokenStorage.clear();
    if (current) {
      try {
        await identityApi.logout(current);
      } catch {
        // best-effort token revocation
      }
    }
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({ loading, token, user, signIn, signUp, signOut }),
    [loading, token, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
