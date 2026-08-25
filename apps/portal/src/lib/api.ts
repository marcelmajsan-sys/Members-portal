import type { ApiResponse } from '@ecommerce-hr/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Admin impersonacija ("Logiraj se kao član"): token živi u sessionStorage (samo ovaj tab),
// pa adminova prava sesija u localStorage (dijeli se s /admin aplikacijom) ostaje netaknuta.
export function isImpersonating(): boolean {
  return typeof window !== 'undefined' && !!sessionStorage.getItem('impAccessToken');
}
export function endImpersonation(): void {
  sessionStorage.removeItem('impAccessToken');
  sessionStorage.removeItem('impUser');
  window.location.href = '/admin';
}
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('impAccessToken') || localStorage.getItem('accessToken');
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = localStorage.getItem('refreshToken');
      if (!token) return false;

      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
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
  retry = true,
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry && typeof window !== 'undefined') {
      // Impersonacija nema refresh token — istekla znači kraj testnog načina, natrag u admin
      if (isImpersonating()) {
        endImpersonation();
        return { success: false, error: { code: 'UNAUTHORIZED', message: 'Testna sesija je istekla' } };
      }
      const refreshed = await refreshToken();
      if (refreshed) {
        return request<T>(method, path, body, false);
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';

      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sesija je istekla, prijavite se ponovno' } };
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
  get<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>('GET', path);
  },
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body);
  },
  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>('PUT', path, body);
  },
  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>('PATCH', path, body);
  },
  del<T>(path: string): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path);
  },
};
