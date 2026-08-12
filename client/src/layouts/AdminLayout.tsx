import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import AdminSidebar from '../components/admin/AdminSidebar'
import DashboardHeader from '../components/common/DashboardHeader'
import { useAuth } from '../context/AuthContext'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { user } = useAuth()

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  const handleOpenSidebar = () => {
    setSidebarOpen(true)
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* =====================================================
          SIDEBAR
          Dark theme remains unchanged
      ====================================================== */}

      <AdminSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={handleCloseSidebar}
        user={user}
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
            SINGLE ADMIN HEADER
            Dark navbar remains unchanged
        ===================================================== */}

        <DashboardHeader
          user={user}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onMenuClick={handleOpenSidebar}
        />

        {/* ===================================================
            PAGE CONTENT
            Light glass theme
        ===================================================== */}

        <main
          className="
            relative
            min-h-[calc(100vh-72px)]
            overflow-hidden
            bg-gradient-to-br
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
              BACKGROUND GLOW
          ================================================= */}

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
              PAGE CONTENT
          ================================================= */}

          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
