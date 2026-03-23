import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'jpg'
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Image workspace: upload and colorize photos. */
export default function DashboardWorkspace() {
  const { user, refreshUser } = useAuth()
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    setOutputUrl(null)
    setError(null)
  }, [])

  const handleRun = useCallback(async () => {
    if (!file) {
      setError('Choose an image first.')
      return
    }
    setError(null)
    setLoading(true)
    setOutputUrl(null)
    try {
      const res = await api.ai.processImage(file)
      setOutputUrl(res.outputUrl)
      void refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [file, refreshUser])

  const handleExport = useCallback(async () => {
    if (!outputUrl || !file) return
    setExporting(true)
    try {
      const res = await fetch(outputUrl)
      if (!res.ok) throw new Error('bad response')
      const blob = await res.blob()
      const ext = extFromMime(blob.type || 'image/jpeg')
      const stem = file.name.replace(/\.[^.]+$/, '') || 'photo'
      triggerBlobDownload(blob, `${stem}-colorized.${ext}`)
    } catch {
      window.open(outputUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setExporting(false)
    }
  }, [outputUrl, file])

  const plan = user?.subscriptionPlan
  const colorizeUsed = user?.colorizeUsedThisMonth
  const colorizeLimit = user?.colorizeLimitMonthly

  return (
    <div className="dashboardPage dashboardWorkspacePage">
      <header className="dashboardWorkspacePageHeader">
        <h1 className="dashboardPageTitle">Workspace</h1>
        <p className="dashboardPageSubtitle dashboardWorkspaceLead">
          Upload a photo, then run <strong>Colorize</strong> (B&amp;W → color). An active subscription is required.
        </p>
      </header>

      {!plan && (
        <p className="dashboardWorkspaceHint dashboardWorkspaceHint--plan">
          You do not have an active plan.{' '}
          <Link to="/dashboard/settings">Subscribe in Settings</Link> to colorize images, or{' '}
          <Link to="/#pricing">view plans</Link> on the home page.
        </p>
      )}
      {plan && colorizeLimit != null && colorizeLimit > 0 && (
        <p className="dashboardWorkspaceQuota">
          This month: <strong>{colorizeUsed ?? 0}</strong> / <strong>{colorizeLimit}</strong> colorizations ·{' '}
          <Link to="/dashboard/settings">Change plan</Link>
        </p>
      )}

      <div className="dashboardCard dashboardImageWorkspace dashboardWorkspaceCard">
        <div className="dashboardWorkspaceUploadBar">
          <label htmlFor={inputId} className="dashboardWorkspaceChooseBtn">
            Choose image
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="dashboardImageFileInput"
            onChange={handleFileChange}
          />
          <span className="dashboardWorkspaceFileName" title={file?.name ?? undefined}>
            {file ? file.name : 'No file selected'}
          </span>
        </div>

        <div className="dashboardWorkspaceRunRow">
          <button
            type="button"
            className="dashboardBtn dashboardBtnPrimary dashboardWorkspaceColorizeBtn"
            onClick={handleRun}
            disabled={loading || !file}
          >
            {loading ? 'Colorizing…' : 'Colorize'}
          </button>
        </div>

        {error && <p className="dashboardSettingsError dashboardWorkspaceError" role="alert">{error}</p>}

        <div className="dashboardWorkspaceCompareShell">
          <div className="dashboardImageCompare dashboardWorkspaceCompare">
            <figure className="dashboardImagePane dashboardWorkspacePane">
              <figcaption>Original</figcaption>
              {previewUrl ? (
                <div className="dashboardWorkspacePaneFrame">
                  <img src={previewUrl} alt="" className="dashboardImagePreview" />
                </div>
              ) : (
                <div className="dashboardImagePlaceholder dashboardWorkspacePlaceholder">Choose an image to preview</div>
              )}
            </figure>
            <figure className="dashboardImagePane dashboardWorkspacePane">
              <figcaption>Result</figcaption>
              {outputUrl ? (
                <div className="dashboardWorkspacePaneFrame">
                  <img src={outputUrl} alt="Colorized result" className="dashboardImagePreview" />
                </div>
              ) : (
                <div className="dashboardImagePlaceholder dashboardWorkspacePlaceholder">
                  {loading ? 'Working…' : 'Run Colorize to preview'}
                </div>
              )}
            </figure>
          </div>
        </div>

        {outputUrl && (
          <div className="dashboardWorkspaceResultActions">
            <button
              type="button"
              className="dashboardBtn dashboardBtnPrimary dashboardWorkspaceExportBtn"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            <a
              href={outputUrl}
              target="_blank"
              rel="noreferrer"
              className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceOpenBtn"
            >
              Open full size
            </a>
          </div>
        )}
      </div>

      <div className="dashboardWorkspaceFooterActions">
        <Link to="/dashboard" className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceFooterBtn">
          Dashboard
        </Link>
        <Link to="/dashboard/settings" className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceFooterBtn">
          Settings
        </Link>
      </div>
    </div>
  )
}
