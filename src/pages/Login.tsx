import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = (location.state as { message?: string } | null)?.message

  useEffect(() => { clearError() }, [clearError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname
      const goTo = from && from.startsWith('/dashboard') ? from : '/dashboard'
      navigate(goTo, { replace: true })
    } catch (err) {
      // error set in context if API returns message
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Sign in</h1>
        <p className="authSubtitle">Welcome back. Sign in to your account.</p>
        {successMessage && <div className="authSuccess" role="status">{successMessage}</div>}
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
              autoComplete="current-password"
            />
          </label>
          <p className="authForgotWrap">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
          <button type="submit" className="authSubmit">Sign in</button>
        </form>
        <p className="authFooter">
          Don’t have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
