import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AdminSidebar from '../components/admin/AdminSidebar'
import DashboardHeader from '../components/common/DashboardHeader'
import { useAuth } from '../context/AuthContext'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { user } = useAuth()

  // ============================================================
  // NORMALIZE USER DATA
  // ============================================================
  // AuthUser.full_name can be null.
  // AdminSidebar and DashboardHeader expect undefined instead.
  // This keeps the existing functionality unchanged.
  const layoutUser = user
    ? {
        ...user,
        full_name: user.full_name ?? undefined,
      }
    : null

  // ============================================================
  // SIDEBAR CONTROLS
  // ============================================================

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  const handleOpenSidebar = () => {
    setSidebarOpen(true)
  }

  // ============================================================
  // LAYOUT
  // ============================================================

  return (
    <div className="min-h-screen">
      {/* =====================================================
          ADMIN SIDEBAR
      ====================================================== */}

      <AdminSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={handleCloseSidebar}
        user={layoutUser}
      />

      {/* =====================================================
          MAIN AREA
      ====================================================== */}

      <div
        className={`
          min-h-screen
          transition-all
          duration-300
          ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}
        `}
      >
        {/* ===================================================
            ADMIN HEADER
        ===================================================== */}

        <DashboardHeader
          user={layoutUser}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onMenuClick={handleOpenSidebar}
        />

        {/* ===================================================
            PAGE CONTENT
        ===================================================== */}

        <main
          className="
            relative
            min-h-[calc(100vh-72px)]
            overflow-hidden
            bg-linear-to-br
            from-slate-100
            via-indigo-50
            to-sky-50
            px-4
            py-5
            text-slate-900
            sm:px-6
            sm:py-6
            lg:px-8
            lg:py-8
          "
        >
          {/* =================================================
              BACKGROUND GLOW - LEFT
          ================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              -left-32
              top-10
              h-72
              w-72
              rounded-full
              bg-indigo-400/15
              blur-[120px]
            "
          />

          {/* =================================================
              BACKGROUND GLOW - RIGHT
          ================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              right-0
              top-24
              h-80
              w-80
              rounded-full
              bg-sky-400/15
              blur-[130px]
            "
          />

          {/* =================================================
              BACKGROUND GLOW - CENTER
          ================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              bottom-0
              left-1/2
              h-72
              w-72
              -translate-x-1/2
              rounded-full
              bg-purple-400/10
              blur-[130px]
            "
          />

          {/* =================================================
              CURRENT ADMIN PAGE
          ================================================== */}

          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
