import { Link } from 'react-router-dom'

export default function DashboardGuide() {
  return (
    <div className="dashboardPage dashboardGuidePage">
      <h1 className="dashboardPageTitle">How to use Colorizer</h1>
      <p className="dashboardPageSubtitle dashboardGuideLead">
        Colorizer is moving to AI photo colorization and restoration. This guide will expand when upload and processing are live.
      </p>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">What you can do today</h2>
        <ul className="dashboardGuideList">
          <li>
            <strong>Account</strong>: Sign in, verify email, and manage subscription under Settings.
          </li>
          <li>
            <strong>Projects</strong>: Save named projects from the Dashboard. They will back future image sessions.
          </li>
          <li>
            <strong>Workspace</strong>: Opens the workspace area where colorize and restore tools will appear.
          </li>
        </ul>
      </div>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">What is coming</h2>
        <ol className="dashboardGuideSteps">
          <li>
            <span className="dashboardGuideStepNum">1</span>
            <div>
              <strong>Upload</strong> a photo (scan, phone shot, or file).
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">2</span>
            <div>
              <strong>Choose</strong> colorize, restore, or both depending on the pipeline we ship.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">3</span>
            <div>
              <strong>Review and download</strong> the result from your browser.
            </div>
          </li>
        </ol>
      </div>

      <div className="dashboardGuideCta">
        <Link to="/dashboard/workspace" className="dashboardBtn dashboardBtnPrimary">
          Open Workspace
        </Link>
        <Link to="/dashboard" className="dashboardBtn dashboardBtnSecondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
