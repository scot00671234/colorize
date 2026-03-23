import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const SIDEBAR_STORAGE_KEY = 'colorizer-dashboard-sidebar-open'

const SEARCH_ITEMS = [
  { label: 'Dashboard', path: '' },
  { label: 'Workspace', path: '/workspace' },
  { label: 'Guide', path: '/guide' },
  { label: 'Settings', path: '/settings' },
]

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  // Chevron points toward the sidebar edge that will move.
  return collapsed ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const basePath = '/dashboard'

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (raw === 'true') return true
      if (raw === 'false') return false
    } catch {
      // ignore
    }
    return true
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const matches = searchQuery.trim()
    ? SEARCH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : []

  useEffect(() => {
    document.body.dataset.page = 'dashboard'
    return () => {
      if (document.body.dataset.page === 'dashboard') delete document.body.dataset.page
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen))
    } catch {
      // ignore
    }
  }, [sidebarOpen])

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
      <aside className={`dashboardSidebar ${sidebarOpen ? '' : 'dashboardSidebar--collapsed'}`}>
        <button
          type="button"
          className="dashboardSidebarToggle"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <CollapseIcon collapsed={!sidebarOpen} />
        </button>
        <Link to={basePath} className="dashboardBrand">
          <img src="/logo.svg" alt="" className="dashboardLogo" width="24" height="24" />
          <span className="dashboardBrandText">Colorizer</span>
        </Link>
        <div className={`dashboardSidebarContent ${sidebarOpen ? '' : 'dashboardSidebarContent--hidden'}`}>

        <nav className="dashboardNav">
          <Link
            to={basePath}
            className={`dashboardNavLink ${location.pathname === basePath ? 'dashboardNavLinkActive' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to={`${basePath}/workspace`}
            className={`dashboardNavLink ${location.pathname === `${basePath}/workspace` || location.pathname === `${basePath}/resume` ? 'dashboardNavLinkActive' : ''}`}
          >
            Workspace
          </Link>
          <Link
            to={`${basePath}/guide`}
            className={`dashboardNavLink ${location.pathname === `${basePath}/guide` ? 'dashboardNavLinkActive' : ''}`}
          >
            Guide
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
        </div>
      </aside>

      <main className="dashboardMain">
        <Outlet />
      </main>
    </div>
  )
}
