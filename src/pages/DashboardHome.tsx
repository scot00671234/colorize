import { Link } from 'react-router-dom'

export default function DashboardHome() {
  return (
    <div className="dashboardPage dashboardPageOverview">
      <h1 className="dashboardPageTitle">Dashboard</h1>
      <p className="dashboardPageSubtitle">Welcome back. Build and refine your resume, then score it and export to PDF.</p>
      <div className="dashboardCard dashboardOverviewCard">
        <p className="dashboardCardText">
          Go to <Link to="/dashboard/resume" className="dashboardCardLink">Editor</Link> to paste your resume, add a job description, rewrite bullets with AI, get an ATS score, and export a clean PDF.
        </p>
      </div>
    </div>
  )
}
