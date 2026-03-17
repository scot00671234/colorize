import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const SEARCH_ITEMS = [
  { label: 'Dashboard', path: '' },
  { label: 'Resume', path: '/resume' },
  { label: 'Settings', path: '/settings' },
]

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const basePath = '/dashboard'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const matches = searchQuery.trim()
    ? SEARCH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearchSelect(path: string) {
    navigate(path ? `${basePath}${path}` : basePath)
    setSearchQuery('')
    setSearchOpen(false)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    const first = matches[0]
    if (e.key === 'Enter' && first) {
      e.preventDefault()
      handleSearchSelect(first.path)
    }
  }

  return (
    <div className={`dashboard ${sidebarOpen ? '' : 'dashboard--sidebarCollapsed'}`}>
      <button
        type="button"
        className={`dashboardSidebarToggle ${sidebarOpen ? 'dashboardSidebarToggle--inside' : 'dashboardSidebarToggle--float'}`}
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        title={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        <MenuIcon open={sidebarOpen} />
      </button>

      <aside className={`dashboardSidebar ${sidebarOpen ? '' : 'dashboardSidebar--collapsed'}`}>
        <Link to={basePath} className="dashboardBrand">
          <img src="/logo.svg" alt="" className="dashboardLogo" width="24" height="24" />
          <span className="dashboardBrandText">Resume AI</span>
        </Link>

        <nav className="dashboardNav">
          <Link
            to={basePath}
            className={`dashboardNavLink ${location.pathname === basePath ? 'dashboardNavLinkActive' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to={`${basePath}/resume`}
            className={`dashboardNavLink ${location.pathname === `${basePath}/resume` ? 'dashboardNavLinkActive' : ''}`}
          >
            Resume
          </Link>
          <Link
            to={`${basePath}/settings`}
            className={`dashboardNavLink ${location.pathname === `${basePath}/settings` ? 'dashboardNavLinkActive' : ''}`}
          >
            Settings
          </Link>
        </nav>

        <div className="dashboardSidebarTheme">
          <ThemeToggle />
          <span className="dashboardSidebarThemeLabel">Theme</span>
        </div>

        <div className="dashboardSearchWrap" ref={searchRef}>
          <input
            type="search"
            className="dashboardSearch"
            placeholder="Search…"
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && (
            <div className="dashboardSearchDropdown">
              {matches.length > 0 ? (
                matches.map((item) => (
                  <button
                    key={item.path || 'dashboard'}
                    type="button"
                    className="dashboardSearchItem"
                    onClick={() => handleSearchSelect(item.path)}
                  >
                    {item.label}
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <p className="dashboardSearchEmpty">No results</p>
              ) : (
                SEARCH_ITEMS.map((item) => (
                  <button
                    key={item.path || 'dashboard'}
                    type="button"
                    className="dashboardSearchItem"
                    onClick={() => handleSearchSelect(item.path)}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="dashboardSidebarFooter">
          <p className="dashboardUserEmail">{user?.email}</p>
          <button type="button" className="dashboardLogout" onClick={() => { logout(); navigate('/') }}>
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboardMain">
        <Outlet />
      </main>
    </div>
  )
}
