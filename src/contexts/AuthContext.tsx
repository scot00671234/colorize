import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiHttpError, getToken, setToken, clearToken } from '../api/client'

export type User = {
  id: string
  email: string
  emailVerified?: boolean
  createdAt?: string
  isPro?: boolean
  isTeam?: boolean
  projectLimit?: number
}

type AuthState = {
  user: User | null
  loading: boolean
  error: string | null
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { user: u } = await api.auth.me()
      setUser(u)
    } catch (err) {
      // Only treat invalid/expired session as logout. Transient /me failures (5xx, network)
      // must not clear the token on transient failures.
      const status = err instanceof ApiHttpError ? err.status : undefined
      if (status === 401) {
        clearToken()
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      window.history.replaceState({}, '', window.location.pathname + (window.location.hash || ''))
    }
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const res = await api.auth.login(email, password)
      setToken(res.token)
      setUser(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      throw err
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      await api.auth.register(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      clearError: () => setError(null),
      refreshUser,
    }),
    [user, loading, error, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
