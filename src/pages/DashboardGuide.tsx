import { Link } from 'react-router-dom'

export default function DashboardGuide() {
  return (
    <div className="dashboardPage dashboardGuidePage">
      <h1 className="dashboardPageTitle">How to use Colorizer</h1>
      <p className="dashboardPageSubtitle dashboardGuideLead">
        Colorize or restore photos from the workspace. Use projects on the Dashboard to keep work organized.
      </p>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">Workspace: colorize &amp; restore</h2>
        <ol className="dashboardGuideSteps">
          <li>
            <span className="dashboardGuideStepNum">1</span>
            <div>
              Open <strong>Dashboard → Workspace</strong>.
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">2</span>
            <div>
              <strong>Upload</strong> a JPEG, PNG, WebP, or GIF (scan, phone shot, or file).
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">3</span>
            <div>
              Choose <strong>Colorize</strong> or <strong>Restore</strong> (optional scratch/damage option on restore).
            </div>
          </li>
          <li>
            <span className="dashboardGuideStepNum">4</span>
            <div>
              <strong>Run</strong> processing, preview the result, and open or download the output URL.
            </div>
          </li>
        </ol>
      </div>

      <div className="dashboardCard dashboardGuideCard">
        <h2 className="dashboardGuideSectionTitle">Also on the Dashboard</h2>
        <ul className="dashboardGuideList">
          <li>
            <strong>Account</strong>: Sign in, verify email, and manage subscription under Settings.
          </li>
          <li>
            <strong>Projects</strong>: Create named projects from the home view to organize your archive.
          </li>
        </ul>
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
