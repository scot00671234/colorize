import { useState, useEffect, useRef } from 'react'
import { useAuth, type SubscriptionPlan } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, clearToken } from '../api/client'
import { CHECKOUT_PLANS, isCheckoutPlan, type CheckoutPlan } from '../constants/plans'

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
}

export default function DashboardSettings() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState<CheckoutPlan | 'portal' | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const checkoutStarted = useRef(false)

  const currentPlan = user?.subscriptionPlan ?? null

  useEffect(() => {
    // After Stripe checkout/portal redirects back to /dashboard/settings,
    // refresh the user so plan flags and project limits update immediately.
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (searchParams.get('session_id')) {
      refreshUser()
      window.history.replaceState({}, '', '/dashboard/settings')
    }
  }, [searchParams, refreshUser])

  const checkoutParam = searchParams.get('checkout')
  useEffect(() => {
    if (!user || !checkoutParam || !isCheckoutPlan(checkoutParam) || checkoutStarted.current) return
    if (user.subscriptionPlan) {
      window.history.replaceState({}, '', '/dashboard/settings')
      return
    }
    checkoutStarted.current = true
    setBillingError(null)
    setBillingLoading(checkoutParam)
    void (async () => {
      try {
        const { url } = await api.auth.createCheckoutSession(checkoutParam)
        window.history.replaceState({}, '', '/dashboard/settings')
        if (url) window.location.href = url
      } catch (err) {
        checkoutStarted.current = false
        setBillingError(err instanceof Error ? err.message : 'Failed to start checkout')
        setBillingLoading(null)
      }
    })()
  }, [user, checkoutParam])

  async function handleUpgrade(plan: CheckoutPlan) {
    setBillingError(null)
    setBillingLoading(plan)
    try {
      const { url } = await api.auth.createCheckoutSession(plan)
      if (url) window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setBillingLoading(null)
    }
  }

  async function handleCancelSubscription() {
    setBillingError(null)
    setBillingLoading('portal')
    try {
      const { url } = await api.auth.createPortalSession()
      if (url) window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setBillingLoading(null)
    }
  }

  async function handleChangePlan(plan: CheckoutPlan) {
    setBillingError(null)
    setBillingLoading('portal')
    try {
      const { url } = await api.auth.createPortalSession(plan)
      if (url) window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setBillingLoading(null)
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await api.auth.deleteAccount()
      clearToken()
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="dashboardPage">
      <h1 className="dashboardPageTitle">Settings</h1>
      <p className="dashboardPageSubtitle">Manage your account and subscription.</p>

      <section className="dashboardSettingsSection">
        <h2 className="dashboardSettingsHeading">Subscription</h2>
        <div className="dashboardCard">
          <p className="dashboardSettingsPlan">
            Current plan:{' '}
            <strong>{currentPlan ? PLAN_LABEL[currentPlan] : 'None — subscribe to colorize'}</strong>
            {currentPlan && user?.projectLimit != null && (
              <span className="dashboardSettingsPlanHint">
                {' '}
                — up to {user.projectLimit} saved projects
              </span>
            )}
          </p>
          {currentPlan &&
            user?.colorizeLimitMonthly != null &&
            user.colorizeLimitMonthly > 0 && (
              <p className="dashboardSettingsHint">
                Colorizations this month:{' '}
                <strong>
                  {user.colorizeUsedThisMonth ?? 0} / {user.colorizeLimitMonthly}
                </strong>{' '}
                (resets each calendar month)
              </p>
            )}
          <p className="dashboardSettingsHint">
            {currentPlan
              ? 'Billing is managed with Stripe. Use the portal to update payment, switch between Starter / Pro / Studio, or cancel.'
              : 'Starter ($19/mo), Pro ($29/mo), and Studio ($99/mo) include monthly colorization allowances and project limits. Checkout opens in Stripe.'}
          </p>
          {billingError && <p className="dashboardSettingsError">{billingError}</p>}
          <div className="dashboardSettingsActions">
            {!currentPlan && (
              <>
                {CHECKOUT_PLANS.map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    className={
                      plan === 'pro' ? 'dashboardBtn dashboardBtnPrimary' : 'dashboardBtn dashboardBtnSecondary'
                    }
                    onClick={() => handleUpgrade(plan)}
                    disabled={!user || billingLoading !== null}
                  >
                    {billingLoading === plan ? 'Opening…' : `Subscribe — ${PLAN_LABEL[plan]}`}
                  </button>
                ))}
              </>
            )}
            {currentPlan && (
              <>
                {CHECKOUT_PLANS.filter((p) => p !== currentPlan).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    className="dashboardBtn dashboardBtnSecondary"
                    onClick={() => handleChangePlan(plan)}
                    disabled={!user || billingLoading !== null}
                  >
                    {billingLoading === 'portal' ? 'Opening…' : `Switch to ${PLAN_LABEL[plan]}`}
                  </button>
                ))}
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary"
                  onClick={handleCancelSubscription}
                  disabled={!user || billingLoading !== null}
                >
                  {billingLoading === 'portal' ? 'Opening…' : 'Manage subscription'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="dashboardSettingsSection">
        <h2 className="dashboardSettingsHeading">Account</h2>
        <div className="dashboardCard">
          <button
            type="button"
            className="dashboardBtn dashboardBtnSecondary"
            onClick={() => { logout(); navigate('/') }}
          >
            Log out
          </button>
        </div>
      </section>

      <section className="dashboardSettingsSection">
        <h2 className="dashboardSettingsHeading">Contact us</h2>
        <div className="dashboardCard">
          <p className="dashboardSettingsHint">
            Questions, feedback, or support? Reach us by email.
          </p>
          <a href="mailto:bioqz-customer@outlook.com" className="dashboardSettingsContactLink">
            bioqz-customer@outlook.com
          </a>
        </div>
      </section>

      <section className="dashboardSettingsSection">
        <h2 className="dashboardSettingsHeading dashboardSettingsHeadingDanger">Delete account</h2>
        <div className="dashboardCard dashboardCardDanger">
          {!confirmDelete ? (
            <>
              <p className="dashboardSettingsHint">
                Permanently delete your account. This will cancel your subscription and remove all your data. This cannot be undone.
              </p>
              <button
                type="button"
                className="dashboardBtn dashboardBtnDanger"
                onClick={() => setConfirmDelete(true)}
              >
                Delete account
              </button>
            </>
          ) : (
            <>
              <p className="dashboardSettingsHint">
                Are you sure? This will cancel your subscription and permanently delete your account. This cannot be undone.
              </p>
              {deleteError && <p className="dashboardSettingsError">{deleteError}</p>}
              <div className="dashboardSettingsActions">
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary"
                  onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnDanger"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
