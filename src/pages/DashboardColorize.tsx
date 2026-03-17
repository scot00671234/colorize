import { useState, useEffect, useRef, useCallback } from 'react'
import { api, type Job } from '../api/client'

const POLL_INTERVAL_MS = 2000
const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'

export default function DashboardColorize() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [photoLimit, setPhotoLimit] = useState(0)
  const [photoCount, setPhotoCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadJobs = useCallback(() => {
    api.jobs
      .list()
      .then((res) => {
        setJobs(res.jobs)
        setPhotoLimit(res.photoLimit)
        setPhotoCount(res.photoCount)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    const pending = jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
    if (pending.length === 0) return
    const t = setInterval(() => {
      pending.forEach(({ id }) => {
        api.jobs
          .get(id)
          .then((job) => {
            setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...job } : j)))
          })
          .catch(() => {})
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [jobs])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    api.jobs
      .create(file, 'colorize')
      .then((created) => {
        setJobs((prev) => [
          {
            id: created.id,
            type: created.type,
            status: created.status,
            inputUrl: created.inputUrl,
            outputUrl: null,
            error_message: null,
            created_at: created.createdAt,
            updated_at: created.createdAt,
          },
          ...prev,
        ])
        setPhotoCount((c) => c + 1)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Upload failed'))
      .finally(() => {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      })
  }

  function downloadOutput(job: Job) {
    if (!job.outputUrl) return
    const a = document.createElement('a')
    a.href = job.outputUrl
    a.download = `colorized-${job.id}.png`
    a.rel = 'noopener noreferrer'
    a.click()
  }

  function handleDelete(job: Job) {
    if (deletingId) return
    setError(null)
    setDeletingId(job.id)
    api.jobs
      .delete(job.id)
      .then(() => {
        setJobs((prev) => prev.filter((j) => j.id !== job.id))
        setPhotoCount((c) => Math.max(0, c - 1))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete'))
      .finally(() => setDeletingId(null))
  }

  const atLimit = photoLimit > 0 && photoCount >= photoLimit

  return (
    <div className="dashboardPage">
      <h1 className="dashboardPageTitle">Colorize</h1>
      <p className="dashboardPageSubtitle">Upload a black & white photo to colorize it with AI.</p>

      <section className="dashboardCard" aria-label="Upload">
        <h2 className="dashboardPageSubtitle">Upload photo</h2>
        <p className="dashboardCardText">
          {photoLimit === 0
            ? 'Subscribe to a plan in Settings to upload and colorize photos.'
            : `JPEG, PNG, WebP or GIF. Max 10MB. ${photoCount} / ${photoLimit} photos used.`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={uploading || atLimit}
          className="dashboardColorizeInput"
          aria-label="Choose image"
        />
        {atLimit && photoLimit > 0 && (
          <p className="dashboardCardText">Limit reached. Delete a photo below to free space or upgrade in Settings.</p>
        )}
        {uploading && <p className="dashboardCardText">Uploading and processing…</p>}
        {error && <p className="dashboardSettingsError" role="alert">{error}</p>}
      </section>

      <section className="dashboardCard" aria-label="Your jobs">
        <h2 className="dashboardPageSubtitle">Your colorizations</h2>
        {loading ? (
          <p className="dashboardCardText">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="dashboardCardText">No jobs yet. Upload a photo above.</p>
        ) : (
          <ul className="dashboardColorizeList">
            {jobs.map((job) => (
              <li key={job.id} className="dashboardColorizeItem">
                <div className="dashboardColorizeThumbs">
                  {job.inputUrl && (
                    <div className="dashboardColorizeThumb">
                      <span className="dashboardColorizeLabel">Original</span>
                      <img src={job.inputUrl} alt="Original" />
                    </div>
                  )}
                  {job.outputUrl ? (
                    <div className="dashboardColorizeThumb">
                      <span className="dashboardColorizeLabel">Colorized</span>
                      <img src={job.outputUrl} alt="Colorized" />
                    </div>
                  ) : (
                    <div className="dashboardColorizeThumb dashboardColorizeThumbPlaceholder">
                      <span className="dashboardColorizeLabel">Colorized</span>
                      <span className="dashboardColorizeStatus">
                        {job.status === 'pending' || job.status === 'processing' ? 'Processing…' : job.status === 'failed' ? job.error_message || 'Failed' : '—'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="dashboardColorizeMeta">
                  <span>{new Date(job.created_at).toLocaleString()}</span>
                  <span className="dashboardColorizeMetaActions">
                    {job.status === 'completed' && job.outputUrl && (
                      <button type="button" className="dashboardCardLink" onClick={() => downloadOutput(job)}>
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      className="dashboardCardLink dashboardColorizeDelete"
                      onClick={() => handleDelete(job)}
                      disabled={deletingId === job.id}
                      aria-label="Delete photo"
                    >
                      {deletingId === job.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
