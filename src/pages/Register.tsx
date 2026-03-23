import { useState, useEffect, FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, getGoogleAuthUrl } from '../api/client'
import { isCheckoutPlan } from '../constants/plans'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const { register, error, clearError } = useAuth()
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  const loginHref =
    planParam && isCheckoutPlan(planParam) ? `/login?plan=${planParam}` : '/login'
  const googleReturnTo =
    planParam && isCheckoutPlan(planParam)
      ? `/dashboard/settings?checkout=${planParam}`
      : '/dashboard'

  useEffect(() => {
    document.body.dataset.page = 'auth'
    return () => { delete document.body.dataset.page }
  }, [])

  useEffect(() => {
    if (planParam && isCheckoutPlan(planParam)) {
      sessionStorage.setItem('pendingCheckoutPlan', planParam)
    }
  }, [planParam])

  useEffect(() => { clearError() }, [clearError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await register(email, password)
      setSent(true)
    } catch (err) {
      // error set in context
    }
  }

  async function handleResend() {
    setResendMessage(null)
    setResendLoading(true)
    try {
      await api.auth.resendVerification(email)
      setResendMessage('Verification email sent. Check your inbox.')
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Failed to send.')
    } finally {
      setResendLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="authPage">
        <div className="authCard">
          <h1 className="authTitle">Check your email</h1>
          <p className="authSubtitle">
            We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account, then sign in.
          </p>
          {resendMessage && <p className="authSubtitle" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{resendMessage}</p>}
          <p className="authFooter" style={{ marginTop: '1rem' }}>
            <button type="button" className="authSecondary" onClick={handleResend} disabled={resendLoading} style={{ border: 'none', background: 'none', padding: 0, cursor: resendLoading ? 'wait' : 'pointer' }}>
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          </p>
          <p className="authFooter">
            Wrong email?{' '}
            <Link to={planParam && isCheckoutPlan(planParam) ? `/register?plan=${planParam}` : '/register'}>
              Sign up again
            </Link>{' '}
            · <Link to={loginHref}>Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Create account</h1>
        <p className="authSubtitle">
          Create your account, then subscribe to Starter, Pro, or Studio to use colorization in the workspace.
        </p>
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
            />
          </label>
          <label className="authLabel">
            Password
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
          <p className="authHint">At least 8 characters.</p>
          <button type="submit" className="authSubmit">Create account</button>
        </form>
        <div className="authDivider">or</div>
        <a href={getGoogleAuthUrl(googleReturnTo)} className="authGoogleBtn" data-auth="google">
          Continue with Google
        </a>
        <p className="authFooter">
          Already have an account? <Link to={loginHref}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
