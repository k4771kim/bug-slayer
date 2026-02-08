/**
 * API Client Utility for Bug Slayer
 * Centralized fetch wrapper with credentials and error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://bug-slayer-api-production.up.railway.app';

const TOKEN_KEY = 'bug-slayer-token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Generic API call wrapper with token auth and error handling
 * @param endpoint - API endpoint path (e.g., '/api/auth/login')
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 * @throws Error with server error message on failed requests
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const token = getStoredToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: 'include', // Keep cookies as fallback
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'DELETE' });
}
