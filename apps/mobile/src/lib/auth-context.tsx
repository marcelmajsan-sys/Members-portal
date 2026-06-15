import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from './api';
import { storage } from './storage';
import { unregisterPushNotifications } from './push-notifications';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem('user');
      const token = await storage.getItem('accessToken');
      if (stored && token) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          await storage.removeItem('user');
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken?: string;
        user: User;
      }>('/api/auth/login', { email, password });

      if (res.success && res.data) {
        await storage.setItem('accessToken', res.data.accessToken);
        if (res.data.refreshToken) {
          await storage.setItem('refreshToken', res.data.refreshToken);
        }
        await storage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true };
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

  const logout = useCallback(async () => {
    await unregisterPushNotifications();
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
