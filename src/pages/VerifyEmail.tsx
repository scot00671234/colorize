import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const didVerify = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing confirmation link.')
      return
    }
    if (didVerify.current) return
    didVerify.current = true
    api.auth
      .verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed.')
      })
  }, [token])

  return (
    <div className="authPage">
      <div className="authCard">
        {status === 'loading' && (
          <>
            <h1 className="authTitle">Verifying…</h1>
            <p className="authSubtitle">Please wait.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="authTitle">Email verified</h1>
            <p className="authSubtitle">{message}</p>
            <Link to="/login" className="authSubmit" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
              Sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="authTitle">Verification failed</h1>
            <p className="authSubtitle">{message}</p>
            <p className="authFooter">
              <Link to="/register">Sign up again</Link> · <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
