"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearTokens, hasRefreshToken, post, refreshSession, saveTokens } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  error: string | null;
  login: () => Promise<void>;
  exchange: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let exchangePromise: Promise<{ user: User; accessToken: string; refreshToken?: string }> | null = null;
let exchangeCode: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (hasRefreshToken()) {
          await refreshSession();
          const result = await api<{ user: User }>("/api/v1/auth/me");
          if (active) setUser(result.user);
        }
      } catch {
        if (active) setError("Could not restore your session. Please sign in again.");
      } finally {
        if (active) setReady(true);
      }
    }
    void restore();
    const expired = () => { setUser(null); setError("Your session expired. Please sign in again."); };
    window.addEventListener("auth-expired", expired);
    return () => { active = false; window.removeEventListener("auth-expired", expired); };
  }, []);

  const login = useCallback(async () => {
    setError(null);
    const redirect = `${window.location.origin}/auth`;
    const result = await api<{ authorizationUrl: string }>(`/api/v1/auth/login?redirect_uri=${encodeURIComponent(redirect)}`);
    window.location.assign(result.authorizationUrl);
  }, []);

  const exchange = useCallback(async (code: string) => {
    if (!exchangePromise || exchangeCode !== code) {
      exchangeCode = code;
      exchangePromise = post("/api/v1/auth/exchange", { data: { code } });
    }
    try {
      const result = await exchangePromise;
      saveTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      setError(null);
    } catch (e) {
      exchangePromise = null;
      exchangeCode = null;
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const result = await post<{ logoutUrl?: string }>("/api/v1/auth/logout", {});
      clearTokens();
      setUser(null);
      if (result.logoutUrl) window.location.assign(result.logoutUrl);
    } catch (e) {
      clearTokens();
      setUser(null);
      throw e;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await api("/api/v1/auth/account", { method: "DELETE" });
    clearTokens();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, error, login, exchange, logout, deleteAccount }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
