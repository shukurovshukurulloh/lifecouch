import type { PublicUser } from "@lifecouch/shared";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "../lib/api";
import { setAccessToken } from "../lib/api";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sahifa yangilanganda httpOnly refresh-cookie orqali sessiyani tiklashga urinamiz.
    (async () => {
      try {
        const session = await api.refresh();
        setAccessToken(session.accessToken);
        setUser(session.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const session = await api.login({ email, password });
      setAccessToken(session.accessToken);
      setUser(session.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirishda xatolik yuz berdi");
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const session = await api.register({ email, password, name });
      setAccessToken(session.accessToken);
      setUser(session.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { user: freshUser } = await api.fetchMe();
    setUser(freshUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth faqat AuthProvider ichida ishlatilishi kerak");
  }
  return ctx;
}
