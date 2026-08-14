'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, isImpersonating as isImpersonatingFn, endImpersonation } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Admin testni način ("Logiraj se kao član") — token u sessionStorage samo za ovaj tab
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    // Admin impersonacija: /#imp=<payload> iz admin panela → spremi u sessionStorage
    // (samo ovaj tab; adminova sesija u localStorage se NE dira) i očisti hash.
    if (window.location.hash.startsWith('#imp=')) {
      try {
        const payload = JSON.parse(decodeURIComponent(window.location.hash.slice(5))) as {
          t: string; u: User; m?: string;
        };
        if (payload?.t && payload?.u) {
          sessionStorage.setItem('impAccessToken', payload.t);
          sessionStorage.setItem('impUser', JSON.stringify(payload.u));
          // Otvori točno članstvo čiji je profil admin gledao
          if (payload.m) localStorage.setItem('selectedMemberId', payload.m);
        }
      } catch { /* neispravan payload — ignoriraj */ }
      history.replaceState(null, '', window.location.pathname);
    }

    if (isImpersonatingFn()) {
      const impUser = sessionStorage.getItem('impUser');
      if (impUser) {
        try {
          setUser(JSON.parse(impUser));
          setImpersonating(true);
          setIsLoading(false);
          return;
        } catch { /* padne na normalnu prijavu ispod */ }
      }
    }

    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken?: string;
        user: User;
      }>('/api/auth/login', { email, password });

      if (res.success && res.data) {
        localStorage.setItem('accessToken', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true, role: res.data.user.role };
      }

      return {
        success: false,
        error: res.error?.message || 'Pogreška pri prijavi',
      };
    } catch {
      return {
        success: false,
        error: 'Ne mogu se spojiti na server',
      };
    }
  }, []);

  const logout = useCallback(() => {
    // Impersonacija: samo zatvori testni način (adminova sesija u localStorage se ne dira)
    if (isImpersonatingFn()) {
      endImpersonation();
      return;
    }
    // Obavijesti server da opozove refresh token (fire-and-forget)
    api.post('/api/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isImpersonating: impersonating,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
