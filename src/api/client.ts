const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const tokenKey = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(tokenKey)
}

export function setToken(token: string): void {
  localStorage.setItem(tokenKey, token)
}

export function clearToken(): void {
  localStorage.removeItem(tokenKey)
}

export type ApiError = { error: string; code?: string }

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url.toString(), { ...init, headers })
  const data = await res.json().catch(() => ({})) as T & ApiError

  if (!res.ok) {
    throw new Error((data as ApiError).error || res.statusText || 'Request failed')
  }
  return data as T
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ message: string; email: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    verifyEmail: (token: string) =>
      request<{ message: string; email: string }>('/api/auth/verify-email', { params: { token } }),

    resendVerification: (email: string) =>
      request<{ message: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    me: () =>
      request<{ user: { id: string; email: string; emailVerified: boolean; createdAt: string } }>('/api/auth/me'),

    deleteAccount: () =>
      request<{ message: string }>('/api/auth/account', { method: 'DELETE' }),

    createCheckoutSession: (plan?: string) =>
      request<{ url: string }>('/api/auth/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan: plan || 'pro' }),
      }),

    createPortalSession: () =>
      request<{ url: string }>('/api/auth/create-portal-session', { method: 'POST', body: '{}' }),
  },
}
