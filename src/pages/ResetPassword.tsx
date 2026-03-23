import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token.trim()) setError('Missing reset link. Request a new password reset.')
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.auth.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true, state: { message: 'Password reset. Sign in with your new password.' } }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="authPage">
        <div className="authCard">
          <h1 className="authTitle">Password reset</h1>
          <p className="authSubtitle">Your password has been updated. Redirecting you to sign in…</p>
          <p className="authFooter">
            <Link to="/login">Sign in now</Link>
          </p>
        </div>
      </div>
    )
  }

  if (!token.trim()) {
    return (
      <div className="authPage">
        <div className="authCard">
          <h1 className="authTitle">Invalid reset link</h1>
          <p className="authSubtitle">{error ?? 'This link is invalid or has expired. Request a new password reset.'}</p>
          <p className="authFooter">
            <Link to="/forgot-password">Request new link</Link> · <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Set new password</h1>
        <p className="authSubtitle">Enter your new password below.</p>
        {error && <div className="authError" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="authForm">
          <label className="authLabel">
            New password
            <input
              type="password"
              className="authInput"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="authLabel">
            Confirm new password
            <input
              type="password"
              className="authInput"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <p className="authHint">At least 8 characters.</p>
          <button type="submit" className="authSubmit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
        <p className="authFooter">
          <Link to="/login">Back to sign in</Link> · <Link to="/forgot-password">Request new link</Link>
        </p>
      </div>
    </div>
  )
}
