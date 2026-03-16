import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const SEARCH_ITEMS = [
  { label: 'Dashboard', path: '' },
  { label: 'Settings', path: '/settings' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const basePath = '/dashboard'

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
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault()
      handleSearchSelect(matches[0].path)
    }
  }

  return (
    <div className="dashboard">
      <aside className="dashboardSidebar">
        <Link to={basePath} className="dashboardBrand">
          <img src="/logo.svg" alt="" className="dashboardLogo" width="24" height="24" />
          <span>Frosted</span>
        </Link>

        <nav className="dashboardNav">
          <Link
            to={basePath}
            className={`dashboardNavLink ${location.pathname === basePath ? 'dashboardNavLinkActive' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to={`${basePath}/settings`}
            className={`dashboardNavLink ${location.pathname === `${basePath}/settings` ? 'dashboardNavLinkActive' : ''}`}
          >
            Settings
          </Link>
        </nav>

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
