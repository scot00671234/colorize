import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import DashboardSettings from './pages/DashboardSettings'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function Nav() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav">
      <div className="navInner">
        <Link to="/" className="navBrand">
          <img src="/logo.svg" alt="" className="navLogo" width="28" height="28" />
          <span>Frosted</span>
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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="settings" element={<DashboardSettings />} />
        </Route>
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </>
  )
}

export default App
