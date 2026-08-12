import { Bell, Bot, CalendarDays, House, LogIn, ScanFace } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import LiveDateTime from '../common/LiveDateTime'

function PublicNavbar() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header
      className="
        fixed inset-x-0 top-0 z-50
        border-b border-white/5
        bg-neutral-950/80
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto flex h-[72px]
          w-full max-w-7xl
          items-center justify-between
          px-6 sm:px-8 lg:px-10
        "
      >
        {/* =====================================================
            LEFT SIDE
        ====================================================== */}

        <div className="flex items-center">
          {/* Home / Logo */}

          <Link
            to="/"
            aria-label="Home"
            title="Home"
            className={`
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              border
              transition-all duration-300

              ${
                isActive('/')
                  ? `
                    scale-105
                    border-red-500/40
                    bg-red-500/20
                    text-red-400
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.8)]
                  `
                  : `
                    border-white/10
                    bg-white/4
                    text-slate-400
                    hover:border-white/20
                    hover:bg-white/8
                    hover:text-white
                  `
              }
            `}
          >
            <House size={17} strokeWidth={1.8} />
          </Link>
        </div>

        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}

        <nav className="flex items-center gap-2 md:gap-3">
          {/* ===================================================
              ATTENDANCE
          ==================================================== */}

          <Link
            to="/attendance"
            className={`
              hidden items-center gap-2
              rounded-xl
              px-3.5 py-2
              text-xs font-semibold
              transition-all duration-300
              sm:flex

              ${
                isActive('/attendance')
                  ? `
                    border border-red-500/40
                    bg-red-500/20
                    text-red-300
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.6)]
                  `
                  : `
                    text-slate-400
                    hover:bg-white/6
                    hover:text-white
                  `
              }
            `}
          >
            <ScanFace
              size={16}
              strokeWidth={1.8}
              className={isActive('/attendance') ? 'animate-pulse text-red-400' : ''}
            />

            <span>Attendance</span>
          </Link>

          {/* ===================================================
              CALENDAR
          ==================================================== */}

          <Link
            to="/calendar"
            className={`
              hidden items-center gap-2
              rounded-xl
              px-3.5 py-2
              text-xs font-semibold
              transition-all duration-300
              sm:flex

              ${
                isActive('/calendar')
                  ? `
                    border border-red-500/40
                    bg-red-500/20
                    text-red-300
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.6)]
                  `
                  : `
                    text-slate-400
                    hover:bg-white/6
                    hover:text-white
                  `
              }
            `}
          >
            <CalendarDays
              size={16}
              strokeWidth={1.8}
              className={isActive('/calendar') ? 'text-red-400' : ''}
            />

            <span>Calendar</span>
          </Link>

          {/* ===================================================
              NOTICE BOARD
          ==================================================== */}

          <Link
            to="/notices"
            aria-label="Notice Board"
            title="Notice Board"
            className={`
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              border
              transition-all duration-300

              ${
                isActive('/notices')
                  ? `
                    scale-105
                    border-red-500/40
                    bg-red-500/20
                    text-red-400
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.8)]
                  `
                  : `
                    border-white/10
                    bg-white/4
                    text-slate-400
                    hover:border-red-400/30
                    hover:bg-red-500/10
                    hover:text-red-300
                  `
              }
            `}
          >
            <Bell size={18} strokeWidth={1.8} />
          </Link>

          {/* ===================================================
              AI ASSISTANT
          ==================================================== */}

          <Link
            to="/ai"
            aria-label="AI Assistant"
            title="AI Assistant"
            className={`
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              border
              transition-all duration-300

              ${
                isActive('/ai')
                  ? `
                    scale-105
                    border-red-500/40
                    bg-red-500/20
                    text-red-400
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.8)]
                  `
                  : `
                    border-white/10
                    bg-white/4
                    text-slate-400
                    hover:border-red-400/30
                    hover:bg-red-500/10
                    hover:text-red-300
                  `
              }
            `}
          >
            <Bot size={18} strokeWidth={1.8} />
          </Link>

          {/* ===================================================
              LOGIN
          ==================================================== */}

          <Link
            to="/login"
            className={`
              flex h-10
              items-center gap-2
              rounded-xl
              border
              px-3.5
              text-xs font-semibold
              transition-all duration-300
              active:scale-95

              ${
                isActive('/login')
                  ? `
                    border-red-500/40
                    bg-red-500/20
                    text-red-300
                    shadow-[0_0_25px_-6px_rgba(239,68,68,0.6)]
                  `
                  : `
                    border-white/10
                    bg-white/6
                    text-slate-200
                    hover:border-red-400/30
                    hover:bg-red-500/10
                    hover:text-white
                  `
              }
            `}
          >
            <LogIn
              size={16}
              strokeWidth={1.8}
              className={isActive('/login') ? 'text-red-400' : ''}
            />

            <span>Login</span>
          </Link>

          {/* ===================================================
              LIVE DATE / TIME
          ==================================================== */}

          <div className="ml-1 hidden md:block">
            <LiveDateTime />
          </div>
        </nav>
      </div>
    </header>
  )
}

export default PublicNavbar
