/** Empty = same-origin (production single-server). Set for local dev or separate API host. */
const API_BASE = (import.meta.env.VITE_API_URL as string) ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')

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

/** Full URL to start Google OAuth. returnTo is the path to land on after sign-in (e.g. /dashboard). */
export function getGoogleAuthUrl(returnTo?: string): string {
  const path = '/api/auth/google'
  const pathTo = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard'
  return buildUrl(path, { returnTo: pathTo })
}

export type ApiError = { error: string; code?: string }

/** Thrown for non-OK HTTP responses so callers can distinguish 401 from transient failures. */
export class ApiHttpError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
  }
}

function buildUrl(path: string, params?: Record<string, string>): string {
  if (path.startsWith('http')) return path
  if (!API_BASE) {
    const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
    return path + q
  }
  const url = new URL(path, API_BASE)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options
  const url = buildUrl(path, params)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (e) {
    const msg = e instanceof TypeError && e.message === 'Failed to fetch'
      ? 'Cannot reach the API. Is the server running on ' + (API_BASE || window.location.origin) + '?'
      : (e instanceof Error ? e.message : 'Request failed')
    throw new Error(msg)
  }

  if (!res.ok) {
    if (res.status === 401) clearToken()
    const data = await res.json().catch(() => ({})) as ApiError
    const message = typeof data?.error === 'string' ? data.error : res.statusText || 'Request failed'
    throw new ApiHttpError(message, res.status)
  }
  if (res.status === 204) return Promise.resolve(undefined as T)
  return res.json() as Promise<T>
}

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = buildUrl(path)
  const headers: HeadersInit = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, { method: 'POST', body: formData, headers })
  } catch (e) {
    const msg = e instanceof TypeError && e.message === 'Failed to fetch'
      ? 'Cannot reach the API. Is the server running on ' + (API_BASE || window.location.origin) + '?'
      : (e instanceof Error ? e.message : 'Request failed')
    throw new Error(msg)
  }

  if (!res.ok) {
    if (res.status === 401) clearToken()
    const data = await res.json().catch(() => ({})) as ApiError
    const message = typeof data?.error === 'string' ? data.error : res.statusText || 'Request failed'
    throw new ApiHttpError(message, res.status)
  }
  return res.json() as Promise<T>
}

async function requestBlob(
  path: string,
  options: RequestInit & { params?: Record<string, string>; body?: string } = {}
): Promise<Blob> {
  const { params, body, ...init } = options
  const url = buildUrl(path, params)
  const headers: HeadersInit = { ...(init.headers as Record<string, string>) }
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...init, headers, body })
  if (!res.ok) {
    if (res.status === 401) clearToken()
    const data = await res.json().catch(() => ({})) as ApiError
    const message = typeof data?.error === 'string' ? data.error : res.statusText || 'Request failed'
    throw new ApiHttpError(message, res.status)
  }
  return res.blob()
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

    requestPasswordReset: (email: string) =>
      request<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),

    me: () =>
      request<{
        user: {
          id: string
          email: string
          emailVerified: boolean
          createdAt: string
          isPro?: boolean
          isTeam?: boolean
          subscriptionPlan?: 'starter' | 'pro' | 'studio' | null
          projectLimit?: number
          colorizeLimitMonthly?: number
          colorizeUsedThisMonth?: number
        }
      }>('/api/auth/me'),

    deleteAccount: () =>
      request<{ message: string }>('/api/auth/account', { method: 'DELETE' }),

    createCheckoutSession: (plan?: string) =>
      request<{ url: string }>('/api/auth/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan: plan || 'pro' }),
      }),

    createPortalSession: (plan?: 'starter' | 'pro' | 'studio' | 'elite') =>
      request<{ url: string }>('/api/auth/create-portal-session', {
        method: 'POST',
        body: JSON.stringify(plan ? { plan: plan === 'elite' ? 'studio' : plan } : {}),
      }),
  },

  ai: {
    processImage: (file: File) => {
      const form = new FormData()
      form.append('image', file)
      return requestFormData<{ outputUrl: string; mode: string }>('/api/ai/process', form)
    },
  },

  resume: {
    exportPdf: (content: string) =>
      requestBlob('/api/resume/export-pdf', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    exportDocx: (content: string) =>
      requestBlob('/api/resume/export-docx', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },

  projects: {
    list: () =>
      request<{
        projects: {
          id: string
          title: string
          content: string
          job_description?: string
          created_at: string
          updated_at: string
        }[]
      }>('/api/projects'),
    get: (id: string) =>
      request<{
        id: string
        title: string
        content: string
        job_description?: string
        created_at: string
        updated_at: string
      }>(`/api/projects/${id}`),
    create: (title: string) =>
      request<{
        id: string
        title: string
        content: string
        job_description?: string
        created_at: string
        updated_at: string
      }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    update: (id: string, data: { title?: string; content?: string; jobDescription?: string }) =>
      request<{
        id: string
        title: string
        content: string
        job_description?: string
        created_at: string
        updated_at: string
      }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  },
}
