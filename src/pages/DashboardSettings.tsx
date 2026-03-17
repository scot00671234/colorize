import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, clearToken } from '../api/client'

export default function DashboardSettings() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState<'pro' | 'enterprise' | 'portal' | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  const isPro = user?.isPro === true

  useEffect(() => {
    if (searchParams.get('session_id')) {
      refreshUser()
      window.history.replaceState({}, '', '/dashboard/settings')
    }
  }, [searchParams, refreshUser])

  async function handleUpgrade(plan: 'pro' | 'enterprise') {
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
            Current plan: <strong>{isPro ? 'Pro' : 'Free'}</strong>
            {isPro && user?.projectLimit != null && (
              <span className="dashboardSettingsPlanHint"> — {user.projectLimit} projects</span>
            )}
          </p>
          <p className="dashboardSettingsHint">
            {isPro
              ? 'Billing is managed with Stripe. Use the portal to update payment or cancel your subscription.'
              : 'Upgrade to Pro for more photo colorizations per month and restoration. Billing is managed with Stripe.'}
          </p>
          {billingError && <p className="dashboardSettingsError">{billingError}</p>}
          <div className="dashboardSettingsActions">
            {!isPro && (
              <>
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnPrimary"
                  onClick={() => handleUpgrade('pro')}
                  disabled={!user || billingLoading !== null}
                >
                  {billingLoading === 'pro' ? 'Opening…' : 'Upgrade to Pro'}
                </button>
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary"
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={!user || billingLoading !== null}
                >
                  {billingLoading === 'enterprise' ? 'Opening…' : 'Upgrade to Enterprise'}
                </button>
              </>
            )}
            {isPro && (
              <button
                type="button"
                className="dashboardBtn dashboardBtnSecondary"
                onClick={handleCancelSubscription}
                disabled={!user || billingLoading !== null}
              >
                {billingLoading === 'portal' ? 'Opening…' : 'Manage subscription'}
              </button>
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
          <a href="mailto:support@yourdomain.com" className="dashboardSettingsContactLink">
            support@yourdomain.com
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
