import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import {
  fileToStorableDataUrl,
  parseColorizeProjectContent,
  stringifyColorizeProjectPayload,
  type ColorizeProjectPayloadV1,
} from '../utils/colorizeProject'

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

function defaultTitleFromFile(file: File | null, loadedName: string | null): string {
  const raw = file?.name || loadedName || 'Photo'
  const stem = raw.replace(/\.[^.]+$/, '') || 'Photo'
  return `${stem} — colorized`
}

/** Image workspace: upload, colorize, save named projects (plan project limits). */
export default function DashboardWorkspace() {
  const { user, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectIdParam = searchParams.get('projectId')
  const inputId = useId()

  const [file, setFile] = useState<File | null>(null)
  const [objectPreviewUrl, setObjectPreviewUrl] = useState<string | null>(null)
  const [originalFromProjectUrl, setOriginalFromProjectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadProjectError, setLoadProjectError] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectTitleDraft, setProjectTitleDraft] = useState('')
  const [loadedOriginalName, setLoadedOriginalName] = useState<string | null>(null)
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0)
  const prevProjectIdParamRef = useRef<string | null>(null)

  const displayOriginalUrl = objectPreviewUrl ?? originalFromProjectUrl

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (!file) {
      setObjectPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (!user?.subscriptionPlan) {
      setProjectCount(null)
      return
    }
    let cancelled = false
    api.projects
      .list()
      .then((r) => {
        if (!cancelled) setProjectCount(r.projects.length)
      })
      .catch(() => {
        if (!cancelled) setProjectCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.subscriptionPlan, projectsRefreshKey])

  useEffect(() => {
    const id = projectIdParam?.trim()
    if (!id) {
      setLoadProjectError(null)
      return
    }
    let cancelled = false
    setLoadProjectError(null)
    setError(null)
    api.projects
      .get(id)
      .then((row) => {
        if (cancelled) return
        const p = parseColorizeProjectContent(row.content || '')
        if (!p) {
          setLoadProjectError('This project has no saved colorization preview yet.')
          setActiveProjectId(row.id)
          setProjectTitleDraft(row.title || '')
          setOutputUrl(null)
          setOriginalFromProjectUrl(null)
          setLoadedOriginalName(null)
          setFile(null)
          return
        }
        setActiveProjectId(row.id)
        setProjectTitleDraft(row.title?.trim() || defaultTitleFromFile(null, p.originalName))
        setOutputUrl(p.resultUrl)
        setLoadedOriginalName(p.originalName)
        setOriginalFromProjectUrl(p.originalDataUrl || null)
        setFile(null)
      })
      .catch(() => {
        if (!cancelled) setLoadProjectError('Could not load this project.')
      })
    return () => {
      cancelled = true
    }
  }, [projectIdParam])

  useEffect(() => {
    const prev = prevProjectIdParamRef.current
    prevProjectIdParamRef.current = projectIdParam
    if (prev && !projectIdParam) {
      setActiveProjectId(null)
      setOriginalFromProjectUrl(null)
      setLoadedOriginalName(null)
      setLoadProjectError(null)
      setOutputUrl(null)
      setProjectTitleDraft('')
      setSaveError(null)
    }
  }, [projectIdParam])

  const clearProjectFromUrl = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('projectId')
      return next
    })
  }, [setSearchParams])

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      setFile(f ?? null)
      setOutputUrl(null)
      setError(null)
      setSaveError(null)
      setLoadProjectError(null)
      setOriginalFromProjectUrl(null)
      setLoadedOriginalName(null)
      setActiveProjectId(null)
      clearProjectFromUrl()
      if (f) setProjectTitleDraft(defaultTitleFromFile(f, null))
    },
    [clearProjectFromUrl]
  )

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
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [file, refreshUser])

  const handleExport = useCallback(async () => {
    if (!outputUrl) return
    setExporting(true)
    try {
      const res = await fetch(outputUrl)
      if (!res.ok) throw new Error('bad response')
      const blob = await res.blob()
      const ext = extFromMime(blob.type || 'image/jpeg')
      const stem =
        (file?.name.replace(/\.[^.]+$/, '') ||
          loadedOriginalName?.replace(/\.[^.]+$/, '') ||
          'photo')
      triggerBlobDownload(blob, `${stem}-colorized.${ext}`)
    } catch {
      window.open(outputUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setExporting(false)
    }
  }, [outputUrl, file, loadedOriginalName])

  const buildPayload = useCallback(async (): Promise<ColorizeProjectPayloadV1 | null> => {
    if (!outputUrl) return null
    const originalName = file?.name || loadedOriginalName || 'image.jpg'
    let originalDataUrl: string | null | undefined
    if (file) {
      originalDataUrl = await fileToStorableDataUrl(file)
    } else if (originalFromProjectUrl?.startsWith('data:')) {
      originalDataUrl = originalFromProjectUrl
    }
    return {
      v: 1,
      kind: 'colorize',
      resultUrl: outputUrl,
      originalName,
      originalDataUrl: originalDataUrl ?? undefined,
    }
  }, [outputUrl, file, loadedOriginalName, originalFromProjectUrl])

  const handleSaveProject = useCallback(async () => {
    if (!outputUrl || !user?.subscriptionPlan) return
    setSaveError(null)
    const title = projectTitleDraft.trim() || 'Untitled'
    const payload = await buildPayload()
    if (!payload) {
      setSaveError('Nothing to save yet.')
      return
    }
    const content = stringifyColorizeProjectPayload(payload)
    setSaving(true)
    try {
      if (activeProjectId && projectIdParam === activeProjectId) {
        await api.projects.update(activeProjectId, {
          title,
          content,
        })
      } else {
        const row = await api.projects.create(title, content)
        setActiveProjectId(row.id)
        setSearchParams({ projectId: row.id })
      }
      setProjectsRefreshKey((k) => k + 1)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [
    outputUrl,
    user?.subscriptionPlan,
    projectTitleDraft,
    buildPayload,
    activeProjectId,
    projectIdParam,
    setSearchParams,
  ])

  const plan = user?.subscriptionPlan
  const colorizeUsed = user?.colorizeUsedThisMonth
  const colorizeLimit = user?.colorizeLimitMonthly
  const projectLimit = user?.projectLimit ?? 1
  const atProjectLimit =
    projectCount != null && activeProjectId == null && projectCount >= projectLimit
  const canSaveNew = plan && outputUrl && !atProjectLimit
  const canUpdate = plan && outputUrl && activeProjectId != null && projectIdParam === activeProjectId

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
      {plan && (
        <p className="dashboardWorkspaceQuota dashboardWorkspaceQuota--secondary">
          Saved projects:{' '}
          <strong>
            {projectCount ?? '—'} / {projectLimit}
          </strong>
          {' · '}
          <Link to="/dashboard">View on Dashboard</Link>
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
          <span className="dashboardWorkspaceFileName" title={file?.name ?? loadedOriginalName ?? undefined}>
            {file ? file.name : loadedOriginalName ? `${loadedOriginalName} (saved)` : 'No file selected'}
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

        {loadProjectError && (
          <p className="dashboardSettingsError dashboardWorkspaceError" role="status">
            {loadProjectError}
          </p>
        )}
        {error && (
          <p className="dashboardSettingsError dashboardWorkspaceError" role="alert">
            {error}
          </p>
        )}

        <div className="dashboardWorkspaceCompareShell">
          <div className="dashboardImageCompare dashboardWorkspaceCompare">
            <figure className="dashboardImagePane dashboardWorkspacePane">
              <figcaption>Original</figcaption>
              {displayOriginalUrl ? (
                <div className="dashboardWorkspacePaneFrame">
                  <img src={displayOriginalUrl} alt="" className="dashboardImagePreview" />
                </div>
              ) : (
                <div className="dashboardImagePlaceholder dashboardWorkspacePlaceholder">
                  Choose an image to preview
                </div>
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

        {outputUrl && plan && (
          <div className="dashboardWorkspaceSaveSection">
            <label className="dashboardWorkspaceSaveLabel" htmlFor="workspace-project-title">
              Project name
            </label>
            <div className="dashboardWorkspaceSaveRow">
              <input
                id="workspace-project-title"
                type="text"
                className="dashboardWorkspaceTitleInput"
                value={projectTitleDraft}
                onChange={(e) => setProjectTitleDraft(e.target.value)}
                maxLength={255}
                placeholder="e.g. Grandpa on the porch"
                autoComplete="off"
              />
              {canUpdate ? (
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceSaveBtn"
                  onClick={handleSaveProject}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              ) : canSaveNew ? (
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceSaveBtn"
                  onClick={handleSaveProject}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save to dashboard'}
                </button>
              ) : (
                <button
                  type="button"
                  className="dashboardBtn dashboardBtnSecondary dashboardWorkspaceSaveBtn"
                  disabled
                  title={`Project limit reached (${projectLimit} for your plan).`}
                >
                  Project limit reached
                </button>
              )}
            </div>
            {atProjectLimit && !canUpdate && (
              <p className="dashboardWorkspaceSaveHint">
                You have reached your project limit. Remove a project on the Dashboard or upgrade in Settings.
              </p>
            )}
            {(canUpdate || canSaveNew) && (
              <p className="dashboardWorkspaceSaveHint">
                Hosted result links can expire—use <strong>Export</strong> for a file you keep. Project limits: Starter 5,
                Pro 25, Studio 100.
              </p>
            )}
            {saveError && (
              <p className="dashboardSettingsError dashboardWorkspaceError" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}

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
