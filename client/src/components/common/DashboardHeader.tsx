import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import LiveDateTime from './LiveDateTime'

export interface DashboardUser {
  id?: string
  login_id?: string
  email?: string
  role?: string
  full_name?: string
  profile_image?: string | null
}

interface DashboardHeaderProps {
  user: DashboardUser | null
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onMenuClick: () => void
}

function DashboardHeader({
  user,
  isSidebarCollapsed,
  onToggleSidebar,
  onMenuClick,
}: DashboardHeaderProps) {
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const profileRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // USER INFORMATION
  // ============================================================

  const displayName = user?.full_name || user?.login_id || user?.email || 'User'

  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'

  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  // ============================================================
  // CLOSE PROFILE WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // ============================================================
  // SEARCH
  // ============================================================

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = searchQuery.trim()

    if (!query) {
      return
    }

    window.dispatchEvent(
      new CustomEvent('dashboard-search', {
        detail: {
          query,
        },
      })
    )
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_type')
    localStorage.removeItem('role')
    localStorage.removeItem('user_id')
    localStorage.removeItem('email')

    setProfileOpen(false)

    navigate('/', {
      replace: true,
    })
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <header className="sticky top-0 z-40 h-18 border-b border-white/6 bg-neutral-950">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* ======================================================
            LEFT
        ======================================================= */}

        <div className="flex items-center gap-2">
          {/* Mobile Sidebar */}

          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-slate-400 transition hover:bg-white/7 hover:text-white lg:hidden"
          >
            <Menu size={19} strokeWidth={1.8} />
          </button>

          {/* Desktop Sidebar Collapse */}

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-slate-400 transition hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* ======================================================
            SEARCH
        ======================================================= */}

        <form onSubmit={handleSearch} className="hidden max-w-xl flex-1 md:block">
          <div className="relative">
            <Search
              size={17}
              strokeWidth={1.8}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search students, faculty..."
              className="h-10 w-full rounded-xl border border-white/8 bg-white/3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-red-500/30 focus:bg-white/5 focus:ring-2 focus:ring-red-500/10"
            />
          </div>
        </form>

        {/* ======================================================
            RIGHT
        ======================================================= */}

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search */}

          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-slate-400 transition hover:bg-white/7 hover:text-white"
            >
              <Search size={18} />
            </button>

            {searchOpen && (
              <form
                onSubmit={handleSearch}
                className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-white/8 bg-neutral-900 p-3 shadow-2xl shadow-black/50"
              >
                <input
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-xl border border-white/8 bg-white/3 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500/30 focus:ring-2 focus:ring-red-500/10"
                />
              </form>
            )}
          </div>

          {/* ==================================================
              LIVE DATE AND TIME
          =================================================== */}

          <div className="hidden rounded-xl border border-white/8 bg-white/3 px-3 py-2 lg:block">
            <LiveDateTime />
          </div>

          {/* ==================================================
              NOTIFICATIONS
          =================================================== */}

          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-slate-400 transition hover:bg-white/7 hover:text-white"
          >
            <Bell size={17} strokeWidth={1.8} />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400" />
          </button>

          {/* Divider */}

          <div className="hidden h-7 w-px bg-white/8 sm:block" />

          {/* ==================================================
              LOGGED-IN USER
          =================================================== */}

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
              className="group flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-white/5 sm:gap-3"
            >
              {/* Profile Image / Initials */}

              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-400">
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || 'U'
                )}
              </div>

              {/* User Information */}

              <div className="hidden max-w-36 text-left sm:block">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {displayRole}
                </p>
              </div>

              <ChevronDown
                size={15}
                strokeWidth={1.8}
                className={`
                  hidden text-slate-500 transition-transform
                  sm:block
                  ${profileOpen ? 'rotate-180' : ''}
                `}
              />
            </button>

            {/* ==================================================
                PROFILE DROPDOWN
            =================================================== */}

            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-white/8 bg-neutral-900 shadow-2xl shadow-black/50">
                {/* Profile Information */}

                <div className="border-b border-white/6 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-400">
                      {user?.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials || 'U'
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>

                      <p className="truncate text-xs text-slate-500">
                        {user?.email || 'No email available'}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                        {displayRole}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Menu */}

                <div className="p-2">
                  {/* My Profile */}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/profile')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <UserRound size={16} strokeWidth={1.8} />
                    My Profile
                  </button>

                  {/* Settings */}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/settings')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Settings size={16} strokeWidth={1.8} />
                    Settings
                  </button>

                  {/* Divider */}

                  <div className="my-1 border-t border-white/6" />

                  {/* Logout */}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut size={16} strokeWidth={1.8} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
