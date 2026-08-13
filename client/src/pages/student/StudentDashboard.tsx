import axios from 'axios'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import DashboardHeader from '../../components/common/DashboardHeader'
import { useAuth } from '../../context/AuthContext'

// ============================================================
// TYPES
// ============================================================

interface StudentProfile {
  id: string
  student_id: string
  login_id: string
  full_name: string
  email: string | null
  phone: string | null
  photo_url: string | null
  department: string
  course: string
  year: number
  semester: number | null
  section: string | null
  is_active: boolean
  is_verified: boolean
}

interface AttendanceSummary {
  total_records: number
  present: number
  late: number
  absent: number
  attendance_rate: number
}

interface AttendanceRecord {
  id: string
  date: string
  status: 'present' | 'late' | 'absent'
  method: 'face' | 'nfc' | 'manual'
  check_in: string | null
  check_out: string | null
  confidence?: number | null
}

interface StudentDashboardResponse {
  student: StudentProfile
  attendance: AttendanceSummary
  today: AttendanceRecord | null
  recent_attendance: AttendanceRecord[]
}

// ============================================================
// API
// ============================================================

const API_BASE_URL = 'http://localhost:8000'

// ============================================================
// AUTH TOKEN
// ============================================================

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

// ============================================================
// IMAGE URL
// ============================================================

function getImageUrl(photoUrl: string | null): string | null {
  if (!photoUrl) {
    return null
  }

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl
  }

  return `${API_BASE_URL}${photoUrl}`
}

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(value: string): string {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================
// TIME FORMAT
// ============================================================

function formatTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================
// API ERROR
// ============================================================

function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot connect to the backend. Make sure FastAPI is running on port 8000.'
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.'
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to access this dashboard.'
    }

    if (error.response?.status === 404) {
      return 'Student dashboard endpoint was not found.'
    }

    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Failed to load student dashboard.'
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================

function StudentDashboard() {
  const { user } = useAuth()

  // DashboardHeader expects full_name to be optional rather than null.
  const headerUser = user
    ? {
        ...user,
        full_name: user.full_name ?? undefined,
      }
    : null

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = getAccessToken()

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      const response = await axios.get<StudentDashboardResponse>(
        `${API_BASE_URL}/student/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
          timeout: 15000,
        }
      )

      setDashboard(response.data)
    } catch (requestError) {
      console.error('Failed to load student dashboard:', requestError)

      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadDashboard])

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div
        className="
          min-h-screen
          bg-linear-to-br
          from-slate-100
          via-indigo-50
          to-cyan-50
          text-slate-900
        "
      >
        {/* FLOATING NAVBAR */}

        <div className="fixed inset-x-0 top-0 z-50">
          <DashboardHeader user={headerUser} isSidebarCollapsed={false} onToggleSidebar={function (): void {
            throw new Error('Function not implemented.')
          } } onMenuClick={function (): void {
            throw new Error('Function not implemented.')
          } } />
        </div>

        {/* CONTENT */}

        <main
          className="
            flex
            min-h-screen
            items-center
            justify-center
            px-6
            pt-28
          "
        >
          <div
            className="
              rounded-3xl
              border
              border-white/70
              bg-white/45
              px-10
              py-9
              text-center
              shadow-xl
              shadow-indigo-500/10
              backdrop-blur-xl
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-indigo-200/60
                bg-indigo-100/60
              "
            >
              <TrendingUp
                size={25}
                className="
                  animate-pulse
                  text-indigo-600
                "
              />
            </div>

            <p
              className="
                mt-4
                text-sm
                font-bold
                text-slate-800
              "
            >
              Loading dashboard...
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Fetching your attendance information.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !dashboard) {
    return (
      <div
        className="
          min-h-screen
          bg-linear-to-br
          from-slate-100
          via-indigo-50
          to-cyan-50
          text-slate-900
        "
      >
        {/* FLOATING NAVBAR */}

        <div className="fixed inset-x-0 top-0 z-50">
          <DashboardHeader user={headerUser} isSidebarCollapsed={false} onToggleSidebar={function (): void {
            throw new Error('Function not implemented.')
          } } onMenuClick={function (): void {
            throw new Error('Function not implemented.')
          } } />
        </div>

        {/* CONTENT */}

        <main
          className="
            flex
            min-h-screen
            items-center
            justify-center
            px-6
            pt-28
          "
        >
          <div
            className="
              w-full
              max-w-lg
              rounded-3xl
              border
              border-red-200/70
              bg-white/50
              p-8
              text-center
              shadow-xl
              shadow-red-500/5
              backdrop-blur-xl
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-red-200
                bg-red-100/70
                text-red-600
              "
            >
              <XCircle size={28} />
            </div>

            <h1
              className="
                mt-5
                text-xl
                font-bold
                text-slate-900
              "
            >
              Unable to load dashboard
            </h1>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-500
              "
            >
              {error || 'No dashboard data was returned.'}
            </p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="
                mt-6
                rounded-xl
                bg-linear-to-r
                from-red-600
                to-rose-600
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-red-500/20
                transition
                hover:-translate-y-0.5
                hover:from-red-500
                hover:to-rose-500
              "
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  const { student, attendance, today, recent_attendance } = dashboard

  const studentName = student.full_name || 'Student'

  const studentPhoto = getImageUrl(student.photo_url)

  const attendancePercentage = Math.min(Math.max(attendance.attendance_rate, 0), 100)

  return (
    <div
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-linear-to-br
        from-slate-100
        via-indigo-50
        to-cyan-50
        text-slate-900
      "
    >
      {/* ======================================================
          BACKGROUND GLOWS
      ====================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -left-40
            top-20
            h-96
            w-96
            rounded-full
            bg-indigo-400/20
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            right-0
            top-28
            h-96
            w-96
            rounded-full
            bg-cyan-400/20
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-0
            left-1/3
            h-96
            w-96
            rounded-full
            bg-purple-400/15
            blur-[130px]
          "
        />

        <div
          className="
            absolute
            bottom-20
            right-1/4
            h-72
            w-72
            rounded-full
            bg-rose-400/10
            blur-[120px]
          "
        />
      </div>

      {/* ======================================================
          FLOATING NAVBAR
      ====================================================== */}

      <div
        className="
          fixed
          inset-x-0
          top-0
          z-50
        "
      >
        <DashboardHeader user={headerUser} isSidebarCollapsed={false} onToggleSidebar={function (): void {
          throw new Error('Function not implemented.')
        } } onMenuClick={function (): void {
          throw new Error('Function not implemented.')
        } } />
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10">
        <main
          className="
            mx-auto
            max-w-7xl
            px-4
            pb-8
            pt-28
            sm:px-6
            lg:px-8
          "
        >
          <div className="space-y-6">
            {/* ==================================================
                WELCOME HEADER
            ================================================== */}

            <section
              className="
                relative
                overflow-hidden
                rounded-3xl
                border
                border-white/70
                bg-white/40
                p-6
                shadow-xl
                shadow-indigo-500/5
                backdrop-blur-xl
                sm:p-7
              "
            >
              <div
                className="
                  absolute
                  -right-20
                  -top-20
                  h-48
                  w-48
                  rounded-full
                  bg-indigo-400/15
                  blur-3xl
                "
              />

              <div
                className="
                  relative
                  flex
                  flex-col
                  justify-between
                  gap-6
                  lg:flex-row
                  lg:items-center
                "
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-xl
                        bg-linear-to-br
                        from-indigo-500
                        to-purple-600
                        text-white
                        shadow-lg
                        shadow-indigo-500/20
                      "
                    >
                      <GraduationCap size={18} />
                    </div>

                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.22em]
                        text-indigo-600
                      "
                    >
                      Student Portal
                    </p>
                  </div>

                  <h1
                    className="
                      mt-4
                      text-3xl
                      font-black
                      tracking-tight
                      text-slate-900
                      sm:text-4xl
                    "
                  >
                    Welcome back, {studentName}
                  </h1>

                  <p
                    className="
                      mt-2
                      text-sm
                      text-slate-500
                    "
                  >
                    Here&apos;s your attendance overview.
                  </p>
                </div>

                {/* PROFILE */}

                <div
                  className="
                    flex
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-white/70
                    bg-white/45
                    px-4
                    py-3
                    shadow-lg
                    shadow-indigo-500/5
                    backdrop-blur-xl
                  "
                >
                  {studentPhoto ? (
                    <img
                      src={studentPhoto}
                      alt={studentName}
                      className="
                        h-14
                        w-14
                        rounded-2xl
                        object-cover
                        shadow-md
                        ring-2
                        ring-white/80
                      "
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-2xl
                        bg-linear-to-br
                        from-indigo-500
                        to-purple-600
                        text-white
                        shadow-lg
                      "
                    >
                      <UserRound size={23} />
                    </div>
                  )}

                  <div>
                    <p
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      {studentName}
                    </p>

                    <p
                      className="
                        mt-1
                        font-mono
                        text-xs
                        text-slate-500
                      "
                    >
                      {student.student_id}
                    </p>

                    <span
                      className="
                        mt-2
                        inline-flex
                        rounded-lg
                        bg-emerald-50
                        px-2
                        py-1
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-emerald-600
                      "
                    >
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                STAT CARDS
            ================================================== */}

            <section
              className="
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >
              <StatCard
                title="Attendance Rate"
                value={`${attendancePercentage.toFixed(1)}%`}
                subtitle="Overall attendance"
                icon={<TrendingUp size={20} />}
                iconClass="
                  border-indigo-200
                  bg-indigo-50
                  text-indigo-600
                "
              />

              <StatCard
                title="Present"
                value={String(attendance.present)}
                subtitle="Days present"
                icon={<CheckCircle2 size={20} />}
                iconClass="
                  border-emerald-200
                  bg-emerald-50
                  text-emerald-600
                "
              />

              <StatCard
                title="Late"
                value={String(attendance.late)}
                subtitle="Late arrivals"
                icon={<Clock3 size={20} />}
                iconClass="
                  border-amber-200
                  bg-amber-50
                  text-amber-600
                "
              />

              <StatCard
                title="Absent"
                value={String(attendance.absent)}
                subtitle="Days absent"
                icon={<XCircle size={20} />}
                iconClass="
                  border-red-200
                  bg-red-50
                  text-red-600
                "
              />
            </section>

            {/* ==================================================
                ATTENDANCE OVERVIEW
            ================================================== */}

            <section
              className="
                grid
                gap-6
                lg:grid-cols-3
              "
            >
              <div
                className="
                  rounded-3xl
                  border
                  border-white/70
                  bg-white/45
                  p-6
                  shadow-xl
                  shadow-indigo-500/5
                  backdrop-blur-xl
                  lg:col-span-2
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >
                  <div>
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.18em]
                        text-indigo-600
                      "
                    >
                      Performance
                    </p>

                    <h2
                      className="
                        mt-1
                        text-lg
                        font-bold
                        text-slate-900
                      "
                    >
                      Attendance Overview
                    </h2>
                  </div>

                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-indigo-200
                      bg-indigo-50
                      text-indigo-600
                    "
                  >
                    <TrendingUp size={20} />
                  </div>
                </div>

                {/* PROGRESS */}

                <div
                  className="
                    mt-7
                    rounded-2xl
                    border
                    border-white/70
                    bg-white/50
                    p-5
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <span
                      className="
                        text-xs
                        font-semibold
                        text-slate-500
                      "
                    >
                      Overall attendance
                    </span>

                    <span
                      className="
                        text-2xl
                        font-black
                        text-indigo-600
                      "
                    >
                      {attendancePercentage.toFixed(1)}%
                    </span>
                  </div>

                  <div
                    className="
                      mt-4
                      h-3
                      overflow-hidden
                      rounded-full
                      bg-slate-200
                    "
                  >
                    <div
                      className="
                        h-full
                        rounded-full
                        bg-linear-to-r
                        from-indigo-500
                        to-purple-500
                        transition-all
                        duration-700
                      "
                      style={{
                        width: `${attendancePercentage}%`,
                      }}
                    />
                  </div>

                  <div
                    className="
                      mt-3
                      flex
                      justify-between
                      text-[11px]
                      text-slate-400
                    "
                  >
                    <span>{attendance.total_records} total records</span>

                    <span>{attendance.present + attendance.late} attended</span>
                  </div>
                </div>

                {/* MINI STATS */}

                <div
                  className="
                    mt-5
                    grid
                    gap-3
                    sm:grid-cols-3
                  "
                >
                  <MiniStat
                    label="Present"
                    value={attendance.present}
                    className="
                      border-emerald-200
                      bg-emerald-50/70
                    "
                    valueClass="text-emerald-600"
                  />

                  <MiniStat
                    label="Late"
                    value={attendance.late}
                    className="
                      border-amber-200
                      bg-amber-50/70
                    "
                    valueClass="text-amber-600"
                  />

                  <MiniStat
                    label="Absent"
                    value={attendance.absent}
                    className="
                      border-red-200
                      bg-red-50/70
                    "
                    valueClass="text-red-600"
                  />
                </div>
              </div>

              {/* ==================================================
                  TODAY
              ================================================== */}

              <div
                className="
                  rounded-3xl
                  border
                  border-white/70
                  bg-white/45
                  p-6
                  shadow-xl
                  shadow-indigo-500/5
                  backdrop-blur-xl
                "
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.18em]
                        text-indigo-600
                      "
                    >
                      Today
                    </p>

                    <h2
                      className="
                        mt-1
                        text-lg
                        font-bold
                        text-slate-900
                      "
                    >
                      Today&apos;s Status
                    </h2>
                  </div>

                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-cyan-200
                      bg-cyan-50
                      text-cyan-600
                    "
                  >
                    <CalendarDays size={20} />
                  </div>
                </div>

                <div
                  className="
                    mt-6
                    rounded-2xl
                    border
                    border-white/70
                    bg-white/50
                    p-5
                  "
                >
                  {today ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              today.status === 'present'
                                ? 'bg-emerald-50 text-emerald-600'
                                : today.status === 'late'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-red-50 text-red-600'
                            }
                          `}
                        >
                          {today.status === 'present' ? (
                            <CheckCircle2 size={21} />
                          ) : today.status === 'late' ? (
                            <Clock3 size={21} />
                          ) : (
                            <XCircle size={21} />
                          )}
                        </div>

                        <div>
                          <p
                            className="
                              text-sm
                              font-bold
                              capitalize
                              text-slate-900
                            "
                          >
                            {today.status}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-xs
                              text-slate-400
                            "
                          >
                            {formatDate(today.date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <InfoRow label="Method" value={today.method.toUpperCase()} />

                        <InfoRow label="Check In" value={formatTime(today.check_in)} />

                        <InfoRow label="Check Out" value={formatTime(today.check_out)} />
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <CalendarDays
                        size={28}
                        className="
                          mx-auto
                          text-slate-300
                        "
                      />

                      <p
                        className="
                          mt-3
                          text-sm
                          font-semibold
                          text-slate-500
                        "
                      >
                        No attendance yet
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        Your attendance for today has not been recorded.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ==================================================
                RECENT ATTENDANCE
            ================================================== */}

            <section
              className="
                overflow-hidden
                rounded-3xl
                border
                border-white/70
                bg-white/45
                shadow-xl
                shadow-indigo-500/5
                backdrop-blur-xl
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-white/60
                  px-6
                  py-5
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.18em]
                      text-indigo-600
                    "
                  >
                    Attendance Log
                  </p>

                  <h2
                    className="
                      mt-1
                      text-lg
                      font-bold
                      text-slate-900
                    "
                  >
                    Recent Attendance
                  </h2>
                </div>

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-indigo-200
                    bg-indigo-50
                    text-indigo-600
                  "
                >
                  <Clock3 size={18} />
                </div>
              </div>

              <div className="overflow-x-auto">
                {recent_attendance.length > 0 ? (
                  <table className="w-full min-w-180 border-collapse">
                    <thead>
                      <tr
                        className="
                          border-b
                          border-white/60
                          bg-white/30
                          text-left
                        "
                      >
                        <TableHeader>Date</TableHeader>

                        <TableHeader>Status</TableHeader>

                        <TableHeader>Method</TableHeader>

                        <TableHeader>Check In</TableHeader>

                        <TableHeader>Check Out</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {recent_attendance.map((record) => (
                        <tr
                          key={record.id}
                          className="
                              border-b
                              border-white/50
                              transition
                              last:border-b-0
                              hover:bg-white/30
                            "
                        >
                          <td className="px-6 py-4">
                            <span
                              className="
                                  text-xs
                                  font-semibold
                                  text-slate-600
                                "
                            >
                              {formatDate(record.date)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge status={record.status} />
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className="
                                  rounded-lg
                                  border
                                  border-slate-200
                                  bg-white/60
                                  px-2.5
                                  py-1
                                  text-[10px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-slate-600
                                "
                            >
                              {record.method}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-500">
                              {formatTime(record.check_in)}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-500">
                              {formatTime(record.check_out)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <Clock3
                      size={30}
                      className="
                        mx-auto
                        text-slate-300
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-sm
                        font-semibold
                        text-slate-500
                      "
                    >
                      No attendance records
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-400
                      "
                    >
                      Your attendance history will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ==================================================
                STUDENT INFORMATION
            ================================================== */}

            <section
              className="
                grid
                gap-6
                lg:grid-cols-2
              "
            >
              <div
                className="
                  rounded-3xl
                  border
                  border-white/70
                  bg-white/45
                  p-6
                  shadow-xl
                  shadow-indigo-500/5
                  backdrop-blur-xl
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-indigo-200
                      bg-indigo-50
                      text-indigo-600
                    "
                  >
                    <UserRound size={19} />
                  </div>

                  <div>
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.16em]
                        text-indigo-600
                      "
                    >
                      Profile
                    </p>

                    <h2
                      className="
                        mt-1
                        text-lg
                        font-bold
                        text-slate-900
                      "
                    >
                      Student Information
                    </h2>
                  </div>
                </div>

                <div className="mt-5">
                  <InfoRow label="Student ID" value={student.student_id} />

                  <InfoRow label="Department" value={student.department} />

                  <InfoRow label="Course" value={student.course} />

                  <InfoRow label="Year" value={String(student.year)} />

                  <InfoRow
                    label="Semester"
                    value={student.semester ? String(student.semester) : '—'}
                  />

                  <InfoRow label="Section" value={student.section || '—'} />
                </div>
              </div>

              {/* ==================================================
                  ACCOUNT STATUS
              ================================================== */}

              <div
                className="
                  rounded-3xl
                  border
                  border-white/70
                  bg-white/45
                  p-6
                  shadow-xl
                  shadow-indigo-500/5
                  backdrop-blur-xl
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      text-emerald-600
                    "
                  >
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.16em]
                        text-emerald-600
                      "
                    >
                      Account
                    </p>

                    <h2
                      className="
                        mt-1
                        text-lg
                        font-bold
                        text-slate-900
                      "
                    >
                      Account Status
                    </h2>
                  </div>
                </div>

                <div
                  className="
                    mt-5
                    rounded-2xl
                    border
                    border-emerald-200/70
                    bg-emerald-50/60
                    p-5
                  "
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="
                        mt-0.5
                        shrink-0
                        text-emerald-600
                      "
                    />

                    <div>
                      <p
                        className="
                          text-sm
                          font-bold
                          text-slate-800
                        "
                      >
                        {student.is_active ? 'Account active' : 'Account inactive'}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-500
                        "
                      >
                        {student.is_verified
                          ? 'Your student account has been verified.'
                          : 'Your student account is awaiting verification.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="
                    mt-4
                    rounded-2xl
                    border
                    border-white/70
                    bg-white/40
                    p-5
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.15em]
                      text-slate-400
                    "
                  >
                    Email
                  </p>

                  <p
                    className="
                      mt-2
                      truncate
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    {student.email || '—'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  iconClass: string
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/70
        bg-white/45
        p-5
        shadow-lg
        shadow-indigo-500/5
        backdrop-blur-xl
        transition
        duration-200
        hover:-translate-y-0.5
        hover:bg-white/55
        hover:shadow-xl
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-slate-400
            "
          >
            {title}
          </p>

          <p
            className="
              mt-2
              text-3xl
              font-black
              tracking-tight
              text-slate-900
            "
          >
            {value}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-400
            "
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            ${iconClass}
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MINI STAT
// ============================================================

function MiniStat({
  label,
  value,
  className,
  valueClass,
}: {
  label: string
  value: number
  className: string
  valueClass: string
}) {
  return (
    <div
      className={`
        rounded-xl
        border
        p-4
        ${className}
      `}
    >
      <p
        className="
          text-[10px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-2
          text-2xl
          font-black
          ${valueClass}
        `}
      >
        {value}
      </p>
    </div>
  )
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-slate-200/60
        py-3.5
        last:border-b-0
      "
    >
      <span
        className="
          text-xs
          font-medium
          text-slate-400
        "
      >
        {label}
      </span>

      <span
        className="
          max-w-[65%]
          truncate
          text-right
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {value}
      </span>
    </div>
  )
}

// ============================================================
// TABLE HEADER
// ============================================================

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="
        px-6
        py-3
        text-[10px]
        font-bold
        uppercase
        tracking-[0.15em]
        text-slate-400
      "
    >
      {children}
    </th>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: 'present' | 'late' | 'absent' }) {
  if (status === 'present') {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          border
          border-emerald-200
          bg-emerald-50
          px-2.5
          py-1
          text-[10px]
          font-bold
          uppercase
          tracking-wider
          text-emerald-600
        "
      >
        <CheckCircle2 size={12} />
        Present
      </span>
    )
  }

  if (status === 'late') {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          border
          border-amber-200
          bg-amber-50
          px-2.5
          py-1
          text-[10px]
          font-bold
          uppercase
          tracking-wider
          text-amber-600
        "
      >
        <Clock3 size={12} />
        Late
      </span>
    )
  }

  return (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        border
        border-red-200
        bg-red-50
        px-2.5
        py-1
        text-[10px]
        font-bold
        uppercase
        tracking-wider
        text-red-600
      "
    >
      <XCircle size={12} />
      Absent
    </span>
  )
}

export default StudentDashboard
