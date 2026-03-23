import { Routes, Route, Link, useLocation, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import DashboardWorkspace from './pages/DashboardWorkspace'
import DashboardSettings from './pages/DashboardSettings'
import DashboardGuide from './pages/DashboardGuide'
import Contact from './pages/Contact'
import Blog from './pages/Blog'
import BlogArticlePage from './pages/BlogArticle'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'
import './App.css'

function LegacyResumeToWorkspace() {
  const [params] = useSearchParams()
  const q = params.toString()
  return <Navigate to={`/dashboard/workspace${q ? `?${q}` : ''}`} replace />
}

function Nav() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav">
      <div className="navInner">
        <Link to="/" className="navBrand">
          <img src="/logo.svg" alt="" className="navLogo" width="28" height="28" />
          <span>Colorizer</span>
        </Link>
        <div className="navLinks">
          <a href="/#about">About</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button type="button" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/register" className="navCta">Get started</Link>
              <Link to="/login">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function App() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')

  return (
    <>
      <div className="noise" aria-hidden />
      {!isDashboard && <Nav />}
      <Routes>
        <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/verify-email" element={<GuestRoute><VerifyEmail /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="workspace" element={<DashboardWorkspace />} />
          <Route path="resume" element={<LegacyResumeToWorkspace />} />
          <Route path="guide" element={<DashboardGuide />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
