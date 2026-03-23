import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setError(null)
  }, [email])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.auth.requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="authPage">
        <div className="authCard">
          <h1 className="authTitle">Check your email</h1>
          <p className="authSubtitle">
            If an account exists for <strong>{email.trim()}</strong>, we sent a password reset link. Click it to set a new password, then sign in.
          </p>
          <p className="authFooter">
            <Link to="/login">Back to sign in</Link> · <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Forgot your password?</h1>
        <p className="authSubtitle">Enter your email and we’ll send you a link to reset it.</p>
        {error && <div className="authError" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="authForm">
          <label className="authLabel">
            Email
            <input
              type="email"
              className="authInput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className="authSubmit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="authFooter">
          Remember your password? <Link to="/login">Sign in</Link> · <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
