import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

type Project = { id: string; title: string; content: string; created_at: string; updated_at: string }

export default function DashboardHome() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.projects.list()
      .then((res) => { if (!cancelled) setProjects(res.projects) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const limit = user?.projectLimit ?? 1

  return (
    <div className="dashboardPage dashboardPageOverview">
      <h1 className="dashboardPageTitle">Dashboard</h1>
      <p className="dashboardPageSubtitle">Manage your account and colorize old photos.</p>
      <div className="dashboardCard dashboardOverviewCard">
        <p className="dashboardCardText">
          Go to <Link to="/dashboard/colorize" className="dashboardCardLink">Colorize</Link> to upload a black & white or damaged photo. Our AI will colorize or restore it; you can download the result from your job history.
        </p>
      </div>
      <section className="dashboardCard" aria-label="Your projects">
        <h2 className="dashboardPageSubtitle">Your projects</h2>
        {error && <p className="dashboardSettingsError">{error}</p>}
        {loading ? (
          <p className="dashboardCardText">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="dashboardCardText">
            No projects yet.
          </p>
        ) : (
          <ul className="dashboardProjectList">
            {projects.map((p) => (
              <li key={p.id}>
                <span className="dashboardCardLink">
                  {p.title || 'Untitled'}
                </span>
                <span className="dashboardProjectMeta">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="dashboardCardText dashboardProjectLimit">
          Project limit: {projects.length} / {limit} (Free: 1, Pro: 10, Team: 100). Upgrade in Settings for more.
        </p>
      </section>
    </div>
  )
}
