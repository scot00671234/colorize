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
      <p className="dashboardPageSubtitle">Welcome back. Build and refine your resume, then score it and export to PDF.</p>
      <div className="dashboardCard dashboardOverviewCard">
        <p className="dashboardCardText">
          Go to <Link to="/dashboard/resume" className="dashboardCardLink">Editor</Link> to paste your resume, add a job description, rewrite bullets with AI, get an ATS score, and export a clean PDF.
        </p>
      </div>
      <section className="dashboardCard" aria-label="Your projects">
        <h2 className="dashboardPageSubtitle">Your projects</h2>
        {error && <p className="dashboardSettingsError">{error}</p>}
        {loading ? (
          <p className="dashboardCardText">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="dashboardCardText">
            No projects yet. <Link to="/dashboard/resume" className="dashboardCardLink">Open the Editor</Link> and save your first resume or application.
          </p>
        ) : (
          <ul className="dashboardProjectList">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/dashboard/resume?projectId=${p.id}`} className="dashboardCardLink">
                  {p.title || 'Untitled'}
                </Link>
                <span className="dashboardProjectMeta">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="dashboardCardText dashboardProjectLimit">
          Project limit: {projects.length} / {limit} (Free: 1, Pro: 10, Team: 100)
        </p>
      </section>
    </div>
  )
}
