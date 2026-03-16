import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api, clearToken } from '../api/client'

export default function DashboardSettings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState<'upgrade' | 'cancel' | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  // Placeholder – replace with real plan from API when you have subscription state
  const currentPlan = 'Pro'

  async function handleUpgrade() {
    setBillingError(null)
    setBillingLoading('upgrade')
    try {
      const { url } = await api.auth.createCheckoutSession('pro')
      if (url) window.location.href = url
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setBillingLoading(null)
    }
  }

  async function handleCancelSubscription() {
    setBillingError(null)
    setBillingLoading('cancel')
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
            Current plan: <strong>{currentPlan}</strong>
          </p>
          <p className="dashboardSettingsHint">
            Billing is managed with Stripe. Upgrade opens checkout; cancel opens the billing portal where you can cancel your subscription.
          </p>
          {billingError && <p className="dashboardSettingsError">{billingError}</p>}
          <div className="dashboardSettingsActions">
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary"
              onClick={handleUpgrade}
              disabled={!user || billingLoading !== null}
            >
              {billingLoading === 'upgrade' ? 'Opening…' : 'Upgrade plan'}
            </button>
            <button
              type="button"
              className="dashboardBtn dashboardBtnSecondary"
              onClick={handleCancelSubscription}
              disabled={!user || billingLoading !== null}
            >
              {billingLoading === 'cancel' ? 'Opening…' : 'Cancel subscription'}
            </button>
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
