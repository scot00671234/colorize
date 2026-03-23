import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import type { CheckoutPlan } from '../constants/plans'

type Props = {
  plan: CheckoutPlan
  className?: string
  children: React.ReactNode
}

/** Logged out → register with ?plan=; logged in → Stripe Checkout for that plan. */
export function PricingPlanCta({ plan, className, children }: Props) {
  const { user, loading } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (loading) {
    return (
      <span className={className} aria-busy>
        …
      </span>
    )
  }

  if (!user) {
    return (
      <Link to={`/register?plan=${plan}`} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setErr(null)
          setBusy(true)
          try {
            const { url } = await api.auth.createCheckoutSession(plan)
            if (url) window.location.href = url
          } catch (e) {
            setErr(e instanceof Error ? e.message : 'Checkout failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Opening checkout…' : children}
      </button>
      {err && (
        <p className="dashboardSettingsError" role="alert" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          {err}
        </p>
      )}
    </>
  )
}
