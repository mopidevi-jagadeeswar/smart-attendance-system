import {
  Bell,
  Brain,
  ClipboardCheck,
  FileBarChart,
  Fingerprint,
  History,
  LayoutDashboard,
  Network,
  ScanFace,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react'

import { useLocation, useNavigate } from 'react-router-dom'

interface SidebarUser {
  id?: string
  login_id?: string
  email?: string
  role?: string
  full_name?: string
  profile_image?: string | null
}

interface AdminSidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  user: SidebarUser | null
}

interface MenuItem {
  label: string
  icon: React.ElementType
  path: string
}

const mainMenu: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
  },
  {
    label: 'Students',
    icon: Users,
    path: '/admin/students',
  },
  {
    label: 'Faculty',
    icon: UserCog,
    path: '/admin/faculty',
  },
  {
    label: 'Attendance',
    icon: ClipboardCheck,
    path: '/admin/attendance',
  },
  {
    label: 'History',
    icon: History,
    path: '/admin/history',
  },
  {
    label: 'Reports',
    icon: FileBarChart,
    path: '/admin/reports',
  },
]

const faceRecognitionMenu: MenuItem[] = [
  {
    label: 'Face Data',
    icon: ScanFace,
    path: '/admin/face-data',
  },
  {
    label: 'Train Model',
    icon: Brain,
    path: '/admin/train-model',
  },
  {
    label: 'Model Status',
    icon: ShieldCheck,
    path: '/admin/model-status',
  },
]

const technologyMenu: MenuItem[] = [
  {
    label: 'NFC',
    icon: Fingerprint,
    path: '/admin/nfc',
  },
  {
    label: 'Behavioral Analysis',
    icon: Network,
    path: '/admin/behavioral-analysis',
  },
]

const managementMenu: MenuItem[] = [
  {
    label: 'Users',
    icon: Users,
    path: '/admin/users',
  },
  {
    label: 'Notices',
    icon: Bell,
    path: '/admin/notices',
  },
]

function AdminSidebar({ isOpen, isCollapsed, onClose, user }: AdminSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const displayName = user?.full_name || user?.login_id || user?.email || 'Administrator'

  const displayRole = user?.role?.toUpperCase() || 'ADMIN'

  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'A'

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard'
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon
    const active = isActive(item.path)

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavigation(item.path)}
        title={isCollapsed ? item.label : undefined}
        className={`
          group relative flex w-full items-center rounded-xl
          transition-all duration-200
          ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-3'}
          ${
            active ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        {active && (
          <span
            className="
              absolute left-0 top-1/2 h-6 w-0.5
              -translate-y-1/2 rounded-full
              bg-red-500
              shadow-[0_0_10px_rgba(239,68,68,1)]
            "
          />
        )}

        <Icon
          size={18}
          strokeWidth={1.8}
          className={`
            shrink-0 transition-all duration-200
            ${active ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-200'}
          `}
        />

        {!isCollapsed && <span className="truncate text-sm font-medium">{item.label}</span>}

        {!isCollapsed && active && (
          <span
            className="
              ml-auto h-1.5 w-1.5 rounded-full
              bg-red-400
              shadow-[0_0_8px_rgba(248,113,113,0.9)]
            "
          />
        )}
      </button>
    )
  }

  const renderSection = (title: string, items: MenuItem[]) => (
    <div className="mt-7">
      {!isCollapsed && (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
          {title}
        </p>
      )}

      <div className="space-y-1">{items.map(renderMenuItem)}</div>
    </div>
  )

  return (
    <>
      {/* Mobile Overlay */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="
            fixed inset-0 z-40
            bg-black/60
            backdrop-blur-sm
            lg:hidden
          "
        />
      )}

      {/* Sidebar */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-white/6
          bg-neutral-950
          shadow-2xl shadow-black/40
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile Close */}

        <div className="flex h-12 shrink-0 items-center justify-end px-3 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="
              rounded-lg p-2
              text-slate-500
              transition
              hover:bg-white/5
              hover:text-white
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* Admin Profile */}

        <div
          className={`
            shrink-0
            border-b border-white/6
            bg-neutral-950
            px-3 py-4
            ${isCollapsed ? 'flex justify-center' : ''}
          `}
        >
          <div
            className={`
              flex items-center
              ${isCollapsed ? 'justify-center' : 'gap-3'}
            `}
          >
            <div className="relative shrink-0">
              <div
                className="
                  flex h-9 w-9 items-center justify-center
                  overflow-hidden rounded-full
                  border border-red-500/30
                  bg-red-500/10
                  text-xs font-semibold text-red-400
                "
              >
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <span
                className="
                  absolute -bottom-0.5 -right-0.5
                  h-2.5 w-2.5 rounded-full
                  border-2 border-neutral-950
                  bg-emerald-400
                "
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>

                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400/80">
                  {displayRole}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Main Menu */}

          {!isCollapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Main Menu
            </p>
          )}

          <div className="space-y-1">{mainMenu.map(renderMenuItem)}</div>

          {/* Face Recognition */}

          {renderSection('Face Recognition', faceRecognitionMenu)}

          {/* Smart Attendance */}

          {renderSection('Smart Attendance', technologyMenu)}

          {/* Management */}

          {renderSection('Management', managementMenu)}
        </div>

        {/* Bottom Status */}

        {!isCollapsed && (
          <div className="shrink-0 border-t border-white/6 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-3 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />

              <span className="text-[10px] font-medium text-emerald-400">System Operational</span>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default AdminSidebar
