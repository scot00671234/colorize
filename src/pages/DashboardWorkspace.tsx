import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

/**
 * Image workspace: upload → colorize via Replicate.
 */
export default function DashboardWorkspace() {
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [file])

  return (
    <div className="dashboardPage">
      <h1 className="dashboardPageTitle">Workspace</h1>
      <p className="dashboardPageSubtitle">
        Upload a photo, then run <strong>Colorize</strong> (B&amp;W → color).
        Processing uses{' '}
        <a href="https://replicate.com" target="_blank" rel="noreferrer">
          Replicate
        </a>
        .
      </p>

      <div className="dashboardCard dashboardImageWorkspace" style={{ marginTop: '1.25rem' }}>
        <div className="dashboardImageWorkspaceToolbar">
          <label htmlFor={inputId} className="dashboardBtn dashboardBtnSecondary" style={{ cursor: 'pointer' }}>
            Choose image
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="dashboardImageFileInput"
            onChange={handleFileChange}
          />
          <span className="dashboardImageFileName">
            {file ? file.name : 'No file selected'}
          </span>
        </div>

        <div className="dashboardImageWorkspaceActions">
          <button
            type="button"
            className="dashboardBtn dashboardBtnPrimary"
            onClick={handleRun}
            disabled={loading || !file}
          >
            {loading ? 'Colorizing…' : 'Colorize'}
          </button>
        </div>

        {error && <p className="dashboardSettingsError" role="alert">{error}</p>}

        <div className="dashboardImageCompare">
          <figure className="dashboardImagePane">
            <figcaption>Original</figcaption>
            {previewUrl ? (
              <img src={previewUrl} alt="" className="dashboardImagePreview" />
            ) : (
              <div className="dashboardImagePlaceholder">Preview</div>
            )}
          </figure>
          <figure className="dashboardImagePane">
            <figcaption>Result</figcaption>
            {outputUrl ? (
              <img src={outputUrl} alt="" className="dashboardImagePreview" />
            ) : (
              <div className="dashboardImagePlaceholder">{loading ? '…' : '—'}</div>
            )}
          </figure>
        </div>

        {outputUrl && (
          <p className="dashboardCardText dashboardImageDownloadRow">
            <a href={outputUrl} target="_blank" rel="noreferrer" className="dashboardBtn dashboardBtnSecondary">
              Open full size
            </a>
          </p>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to="/dashboard" className="dashboardBtn dashboardBtnSecondary">
          Dashboard
        </Link>
        <Link to="/dashboard/settings" className="dashboardBtn dashboardBtnSecondary">
          Settings
        </Link>
      </div>
    </div>
  )
}
