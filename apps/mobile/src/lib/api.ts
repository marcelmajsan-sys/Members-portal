import { API_BASE_URL } from '../constants/config';
import { storage } from './storage';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = await storage.getItem('refreshToken');
      if (!token) return false;

      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.data) {
        await storage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          await storage.setItem('refreshToken', data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = await storage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return request<T>(method, path, body, false);
      }
      await storage.removeItem('accessToken');
      await storage.removeItem('refreshToken');
      await storage.removeItem('user');
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
    }

    const data: ApiResponse<T> = await res.json();
    return data;
  } catch (err) {
    console.error(`API ${method} ${path} failed:`, err);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Ne mogu se spojiti na server' },
    };
  }
}

export const api = {
  get<T>(path: string) { return request<T>('GET', path); },
  post<T>(path: string, body?: unknown) { return request<T>('POST', path, body); },
  put<T>(path: string, body?: unknown) { return request<T>('PUT', path, body); },
  patch<T>(path: string, body?: unknown) { return request<T>('PATCH', path, body); },
  del<T>(path: string) { return request<T>('DELETE', path); },
};
