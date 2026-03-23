import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Page not found</h1>
        <p className="authSubtitle">The page you’re looking for doesn’t exist or has been moved.</p>
        <p className="authFooter">
          <Link to="/">Home</Link> · <Link to="/dashboard">Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
