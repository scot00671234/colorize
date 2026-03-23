import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

type Project = { id: string; title: string; content: string; created_at: string; updated_at: string }

function snippetFromHtml(html: string, maxLen = 140): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length <= maxLen ? text : `${text.slice(0, maxLen).trim()}…`
}

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
      <p className="dashboardPageSubtitle dashboardPageSubtitleCentered">
        Welcome back. Open a saved project or the workspace—photo colorization tools are on the way.
      </p>

      <div className="dashboardCard dashboardOverviewCard dashboardOverviewCardTight">
        <div className="dashboardWelcome">
          <p className="dashboardWelcomeTitle">Your saved projects</p>
          <p className="dashboardCardText dashboardWelcomeBody">
            Click any project to open it in the workspace. Content from earlier versions is preserved.
          </p>
          <div className="dashboardWelcomeActions">
            <Link to="/dashboard/workspace" className="dashboardBtn dashboardBtnPrimary">
              New project
            </Link>
          </div>
        </div>
      </div>

      <section className="dashboardProjects" aria-label="Your projects">
        {error && <p className="dashboardSettingsError">{error}</p>}
        {loading ? (
          <div className="dashboardCard">
            <p className="dashboardCardText">Loading…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="dashboardCard">
            <p className="dashboardCardText">
              No projects yet. Create one from the workspace when you are ready.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/dashboard/workspace" className="dashboardBtn dashboardBtnPrimary">
                Open Workspace
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="dashboardProjectsGrid">
              {projects.map((p) => {
                const title = (p.title || 'Untitled').trim() || 'Untitled'
                const snippet = snippetFromHtml(p.content || '')
                return (
                  <li key={p.id}>
                    <Link to={`/dashboard/workspace?projectId=${p.id}`} className="dashboardProjectCard" aria-label={`Open project ${title}`}>
                      <div className="dashboardProjectCardTop">
                        <span className="dashboardProjectName">{title}</span>
                        <span className="dashboardProjectMeta">
                          Updated {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="dashboardProjectSnippet">
                        {snippet || 'No preview yet. Open to continue.'}
                      </p>
                      <span className="dashboardProjectOpen">Open →</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="dashboardCardText dashboardProjectLimit dashboardProjectLimitCentered">
              Project limit: {projects.length} / {limit}
            </p>
          </>
        )}
      </section>
    </div>
  )
}
