import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/** Renders children only when user is not logged in. If logged in, redirects to dashboard. */
export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="authPage">
        <div className="authCard">
          <p className="authSubtitle">Loading…</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
