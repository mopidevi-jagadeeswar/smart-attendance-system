import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserRound,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'

import apiClient from '../../api/client'
import DashboardHeader from '../../components/common/DashboardHeader'
import { useAuth } from '../../context/AuthContext'

/* ============================================================
   TYPES
============================================================ */

interface FacultyData {
  id: string
  faculty_id: string
  facultyId?: string
  name: string
  full_name?: string | null
  email: string
  department: string | null
  designation?: string | null
  is_active: boolean
  is_verified: boolean
}

interface TodayAttendance {
  date?: string

  total_students?: number
  totalStudents?: number

  total_marked?: number
  totalMarked?: number

  present: number
  late: number
  absent: number

  attendance_rate?: number
  attendanceRate?: number
}

interface RecentAttendance {
  id: string

  student_id: string
  studentId?: string

  student_name?: string
  studentName?: string
  name?: string

  date?: string | null

  time: string | null
  check_in_time?: string | null

  method: string | null
  status: string | null
}

interface AbsentStudent {
  id: string

  student_id: string
  studentId?: string

  name: string
  department: string | null

  date?: string
  status?: string
}

interface FacultyDashboardResponse {
  success?: boolean

  faculty: FacultyData

  today: TodayAttendance

  attendance_overview?: TodayAttendance

  recent_attendance: RecentAttendance[]

  absent_students: AbsentStudent[]
}

/* ============================================================
   FACULTY DASHBOARD
============================================================ */

function FacultyDashboard() {
  const { user, logout } = useAuth()

  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState<string | null>(null)

  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard = useCallback(async (manualRefresh = false) => {
    try {
      if (manualRefresh) {
        setRefreshing(true)
      }

      const token = localStorage.getItem('access_token')

      if (!token) {
        setError('Not authenticated.')
        return
      }

      const response = await apiClient.get<FacultyDashboardResponse>('/api/v1/faculty/dashboard')

      setDashboard(response.data)
      setError(null)
    } catch (requestError) {
      console.error('Faculty dashboard error:', requestError)

      if (requestError && typeof requestError === 'object' && 'response' in requestError) {
        const axiosError = requestError as {
          response?: {
            status?: number
            data?: {
              detail?: string
            }
          }
        }

        const responseStatus = axiosError.response?.status

        if (responseStatus === 401) {
          setError('Your session has expired. Please log in again.')
        } else if (responseStatus === 403) {
          setError('You do not have permission to access the faculty dashboard.')
        } else {
          setError(axiosError.response?.data?.detail ?? 'Unable to load faculty dashboard.')
        }
      } else if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('Unable to load faculty dashboard.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadDashboard])

  /* ==========================================================
     LIVE REFRESH

     The backend is checked every 5 seconds so when NFC
     or face attendance creates a new AttendanceLog,
     this dashboard updates automatically.
  ========================================================== */

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadDashboard()
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadDashboard])

  /* ==========================================================
     DATA
  ========================================================== */

  const faculty = dashboard?.faculty

  const today = dashboard?.today ?? dashboard?.attendance_overview

  const facultyName =
    faculty?.name ?? faculty?.full_name ?? user?.full_name ?? user?.login_id ?? 'Faculty'

  const facultyId = faculty?.faculty_id ?? faculty?.facultyId ?? user?.login_id ?? '—'

  const email = faculty?.email ?? user?.email ?? '—'

  const department = faculty?.department ?? '—'

  const designation = faculty?.designation ?? 'Faculty'

  const attendanceRate = today?.attendance_rate ?? today?.attendanceRate ?? 0

  const presentCount = today?.present ?? 0

  const lateCount = today?.late ?? 0

  const absentCount = today?.absent ?? 0

  const totalStudents =
    today?.total_students ?? today?.totalStudents ?? presentCount + lateCount + absentCount

  const totalMarked = today?.total_marked ?? today?.totalMarked ?? presentCount + lateCount

  const recentAttendance = dashboard?.recent_attendance ?? []

  const absentStudents = dashboard?.absent_students ?? []

  const accountActive = faculty?.is_active ?? user?.is_active ?? false

  /* ==========================================================
     DASHBOARD HEADER USER

     AuthUser has:
       full_name: string | null

     DashboardHeader expects:
       full_name?: string

     Convert null → undefined.
  ========================================================== */

  const headerUser = user
    ? {
        ...user,
        full_name: user.full_name ?? undefined,
      }
    : null

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="
            absolute
            -left-40
            top-20
            h-96
            w-96
            rounded-full
            bg-indigo-200/30
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -right-40
            top-1/3
            h-112
            w-md
            rounded-full
            bg-blue-200/25
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-40
            left-1/2
            h-96
            w-96
            -translate-x-1/2
            rounded-full
            bg-purple-200/20
            blur-3xl
          "
        />
      </div>

      {/* ======================================================
          FLOATING NAVBAR
      ====================================================== */}

      <div className="fixed inset-x-0 top-0 z-50">
        <DashboardHeader user={headerUser} isSidebarCollapsed={false} onToggleSidebar={function (): void {
          throw new Error('Function not implemented.')
        } } onMenuClick={function (): void {
          throw new Error('Function not implemented.')
        } } />
      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        className="
          relative
          z-10
          mx-auto
          max-w-7xl
          px-4
          pb-10
          pt-28
          sm:px-6
          lg:px-8
        "
      >
        <div className="space-y-6">
          {/* ==================================================
              PAGE HEADER
          ================================================== */}

          <section>
            <div
              className="
                flex
                flex-col
                justify-between
                gap-5
                lg:flex-row
                lg:items-center
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.2em]
                    text-indigo-600
                  "
                >
                  Faculty Dashboard
                </p>

                <h1
                  className="
                    mt-2
                    text-3xl
                    font-extrabold
                    tracking-tight
                    text-slate-900
                    sm:text-4xl
                  "
                >
                  Welcome back, {facultyName}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Monitor today&apos;s attendance and student activity.
                </p>
              </div>

              {/* FACULTY BADGE */}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-white/80
                  bg-white/80
                  px-4
                  py-3
                  shadow-xl
                  shadow-slate-200/50
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-indigo-200
                    bg-indigo-50
                    text-indigo-600
                  "
                >
                  <UserRound size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">{facultyName}</p>

                  <p className="mt-0.5 font-mono text-xs text-slate-500">{facultyId}</p>
                </div>

                <span
                  className="
                    ml-2
                    h-2
                    w-2
                    rounded-full
                    bg-emerald-500
                    shadow-[0_0_10px_rgba(16,185,129,0.6)]
                  "
                />
              </div>
            </div>
          </section>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <section
              className="
                rounded-2xl
                border
                border-red-200
                bg-red-50/90
                px-5
                py-4
                shadow-lg
                shadow-red-100/40
                backdrop-blur-xl
              "
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />

                <div>
                  <p className="text-sm font-bold text-red-700">Unable to load attendance data</p>

                  <p className="mt-1 text-xs text-red-600">{error}</p>

                  {error.includes('session') && (
                    <button
                      type="button"
                      onClick={logout}
                      className="
                        mt-3
                        rounded-lg
                        bg-red-600
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-white
                        transition
                        hover:bg-red-700
                      "
                    >
                      Log in again
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading ? (
            <section
              className="
                flex
                min-h-80
                items-center
                justify-center
                rounded-2xl
                border
                border-slate-200
                bg-white/90
                shadow-xl
                shadow-slate-200/50
                backdrop-blur-xl
              "
            >
              <div className="text-center">
                <Loader2
                  size={30}
                  className="
                    mx-auto
                    animate-spin
                    text-indigo-500
                  "
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Loading faculty dashboard...
                </p>

                <p className="mt-1 text-xs text-slate-400">Fetching attendance data.</p>
              </div>
            </section>
          ) : (
            <>
              {/* ==================================================
                  STAT CARDS
              ================================================== */}

              <section
                className="
                  grid
                  gap-4
                  sm:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <StatCard
                  title="Attendance Rate"
                  value={`${attendanceRate}%`}
                  subtitle="Today's attendance"
                  icon={<TrendingUp size={20} />}
                  iconClass="border-blue-200 bg-blue-50 text-blue-600"
                />

                <StatCard
                  title="Present"
                  value={String(presentCount)}
                  subtitle="Students present"
                  icon={<CheckCircle2 size={20} />}
                  iconClass="border-emerald-200 bg-emerald-50 text-emerald-600"
                />

                <StatCard
                  title="Late"
                  value={String(lateCount)}
                  subtitle="Students late"
                  icon={<Clock3 size={20} />}
                  iconClass="border-amber-200 bg-amber-50 text-amber-600"
                />

                <StatCard
                  title="Absent"
                  value={String(absentCount)}
                  subtitle="Students absent"
                  icon={<XCircle size={20} />}
                  iconClass="border-red-200 bg-red-50 text-red-600"
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
                {/* OVERVIEW */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200/80
                    bg-white/90
                    p-6
                    shadow-xl
                    shadow-slate-200/50
                    backdrop-blur-xl
                    lg:col-span-2
                  "
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          uppercase
                          tracking-[0.16em]
                          text-slate-400
                        "
                      >
                        Today
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-slate-900">Attendance Overview</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="
                          hidden
                          rounded-lg
                          bg-emerald-50
                          px-2.5
                          py-1.5
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-wider
                          text-emerald-600
                          sm:inline-flex
                        "
                      >
                        Live
                      </span>

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
                        <TrendingUp size={19} />
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      mt-6
                      grid
                      gap-4
                      sm:grid-cols-3
                    "
                  >
                    <AttendanceMiniCard
                      title="Present"
                      value={String(presentCount)}
                      icon={<CheckCircle2 size={17} />}
                      className="border-emerald-200 bg-emerald-50"
                      iconClass="text-emerald-600"
                    />

                    <AttendanceMiniCard
                      title="Late"
                      value={String(lateCount)}
                      icon={<Clock3 size={17} />}
                      className="border-amber-200 bg-amber-50"
                      iconClass="text-amber-600"
                    />

                    <AttendanceMiniCard
                      title="Absent"
                      value={String(absentCount)}
                      icon={<XCircle size={17} />}
                      className="border-red-200 bg-red-50"
                      iconClass="text-red-600"
                    />
                  </div>

                  {/* RATE */}

                  <div
                    className="
                      mt-5
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50/70
                      p-5
                    "
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Attendance Rate</span>

                      <span className="text-sm font-extrabold text-slate-800">
                        {attendanceRate}%
                      </span>
                    </div>

                    <div
                      className="
                        mt-3
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
                          to-blue-500
                          transition-all
                          duration-700
                        "
                        style={{
                          width: `${Math.min(Math.max(attendanceRate, 0), 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex justify-between text-[11px] text-slate-400">
                      <span>
                        {totalMarked} marked
                        {' / '}
                        {totalStudents} students
                      </span>

                      <span>{presentCount + lateCount} attended</span>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    FACULTY CLASS INFORMATION
                ================================================== */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200/80
                    bg-white/90
                    p-6
                    shadow-xl
                    shadow-slate-200/50
                    backdrop-blur-xl
                  "
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          uppercase
                          tracking-[0.16em]
                          text-slate-400
                        "
                      >
                        Faculty
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-slate-900">Class Information</h2>
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
                        border-purple-200
                        bg-purple-50
                        text-purple-600
                      "
                    >
                      <GraduationCap size={19} />
                    </div>
                  </div>

                  <div
                    className="
                      mt-6
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50/70
                      p-5
                    "
                  >
                    <InfoRow label="Department" value={department} />

                    <InfoRow label="Designation" value={designation} />

                    <InfoRow label="Students" value={String(totalStudents)} />

                    <InfoRow label="Marked" value={String(totalMarked)} />

                    <InfoRow label="Attendance" value={`${attendanceRate}%`} />
                  </div>
                </div>
              </section>

              {/* ==================================================
                  RECENT ATTENDANCE
              ================================================== */}

              <section
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-white/90
                  shadow-xl
                  shadow-slate-200/50
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    border-b
                    border-slate-200
                    px-5
                    py-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Live Records
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">Recent Attendance</h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Automatically refreshed every 5 seconds
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="
                        rounded-lg
                        border
                        border-emerald-200
                        bg-emerald-50
                        px-3
                        py-1.5
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-emerald-600
                      "
                    >
                      {recentAttendance.length} records
                    </span>

                    <button
                      type="button"
                      onClick={() => void loadDashboard(true)}
                      disabled={refreshing}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-slate-600
                        shadow-sm
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {recentAttendance.length > 0 ? (
                    <table className="w-full min-w-180 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                          <TableHeader>Student</TableHeader>

                          <TableHeader>Student ID</TableHeader>

                          <TableHeader>Time</TableHeader>

                          <TableHeader>Method</TableHeader>

                          <TableHeader>Status</TableHeader>
                        </tr>
                      </thead>

                      <tbody>
                        {recentAttendance.map((record) => (
                          <tr
                            key={record.id}
                            className="
                                border-b
                                border-slate-100
                                transition
                                last:border-b-0
                                hover:bg-slate-50
                              "
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {record.student_name ??
                                  record.studentName ??
                                  record.name ??
                                  'Unknown Student'}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-mono text-xs text-slate-500">
                                {record.student_id ?? record.studentId ?? '—'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-xs text-slate-500">
                                {formatTime(record.time ?? record.check_in_time ?? null)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className="
                                    rounded-lg
                                    bg-slate-100
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    text-slate-600
                                  "
                              >
                                {record.method ?? '—'}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={record.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState
                      icon={<Clock3 size={25} />}
                      title="No attendance records"
                      description="No student attendance has been recorded today."
                    />
                  )}
                </div>
              </section>

              {/* ==================================================
                  ABSENT STUDENTS
              ================================================== */}

              <section
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-white/90
                  shadow-xl
                  shadow-slate-200/50
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-slate-200
                    px-5
                    py-5
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Attention Required
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">Absent Students</h2>
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
                      border-red-200
                      bg-red-50
                      text-red-600
                    "
                  >
                    <AlertCircle size={19} />
                  </div>
                </div>

                {absentStudents.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {absentStudents.map((student) => (
                      <div
                        key={student.id}
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            px-5
                            py-4
                            transition
                            hover:bg-slate-50
                          "
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-slate-200
                                bg-slate-100
                                text-slate-400
                              "
                          >
                            <UserRound size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {student.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {student.student_id ?? student.studentId ?? '—'}

                              {student.department ? ` · ${student.department}` : ''}
                            </p>
                          </div>
                        </div>

                        <span
                          className="
                              shrink-0
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
                          Absent
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CheckCircle2 size={27} />}
                    title="No absent students"
                    description="All students have attendance records."
                  />
                )}
              </section>

              {/* ==================================================
                  FACULTY ACCOUNT
              ================================================== */}

              <section
                className="
                  grid
                  gap-6
                  lg:grid-cols-2
                "
              >
                {/* ACCOUNT */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200/80
                    bg-white/90
                    p-6
                    shadow-xl
                    shadow-slate-200/50
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
                          text-xs
                          font-bold
                          uppercase
                          tracking-[0.15em]
                          text-slate-400
                        "
                      >
                        Account
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-slate-900">Faculty Information</h2>
                    </div>
                  </div>

                  <div className="mt-5">
                    <InfoRow label="Name" value={facultyName} />

                    <InfoRow label="Faculty ID" value={facultyId} />

                    <InfoRow label="Email" value={email} />

                    <InfoRow label="Department" value={department} />

                    <InfoRow label="Designation" value={designation} />

                    <InfoRow
                      label="Account Status"
                      value={accountActive ? 'Active' : 'Inactive'}
                      valueClass={accountActive ? 'text-emerald-600' : 'text-red-600'}
                    />
                  </div>
                </div>

                {/* SYSTEM */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200/80
                    bg-white/90
                    p-6
                    shadow-xl
                    shadow-slate-200/50
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
                          text-xs
                          font-bold
                          uppercase
                          tracking-[0.15em]
                          text-slate-400
                        "
                      >
                        System
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-slate-900">Faculty Access</h2>
                    </div>
                  </div>

                  <div
                    className="
                      mt-5
                      rounded-xl
                      border
                      border-emerald-100
                      bg-emerald-50/60
                      p-5
                    "
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />

                      <div>
                        <p className="text-sm font-bold text-slate-800">Faculty account active</p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Your faculty account is available for attendance monitoring and
                          management.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50/70
                      p-5
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.12em]
                        text-slate-400
                      "
                    >
                      Attendance Data
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Attendance information is loaded directly from the Smart Attendance backend
                      and refreshed automatically.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

/* ============================================================
   STAT CARD
============================================================ */

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
  icon: ReactNode
  iconClass: string
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200/80
        bg-white/90
        p-5
        shadow-lg
        shadow-slate-200/50
        backdrop-blur-xl
        transition
        duration-200
        hover:-translate-y-0.5
        hover:shadow-xl
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="
              text-xs
              font-bold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            {title}
          </p>

          <p
            className="
              mt-2
              text-3xl
              font-extrabold
              tracking-tight
              text-slate-900
            "
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
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

/* ============================================================
   ATTENDANCE MINI CARD
============================================================ */

function AttendanceMiniCard({
  title,
  value,
  icon,
  className,
  iconClass,
}: {
  title: string
  value: string
  icon: ReactNode
  className: string
  iconClass: string
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>

        <span className={iconClass}>{icon}</span>
      </div>

      <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({
  label,
  value,
  valueClass = 'text-slate-700',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-slate-100
        py-3.5
        last:border-b-0
      "
    >
      <span className="text-xs font-medium text-slate-400">{label}</span>

      <span
        className={`
          max-w-[65%]
          truncate
          text-right
          text-sm
          font-semibold
          ${valueClass}
        `}
      >
        {value}
      </span>
    </div>
  )
}

/* ============================================================
   TABLE HEADER
============================================================ */

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th
      className="
        px-5
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

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({ status }: { status: string | null }) {
  const normalized = (status ?? '').toLowerCase()

  if (normalized === 'present') {
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

  if (normalized === 'late') {
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
        border-slate-200
        bg-slate-50
        px-2.5
        py-1
        text-[10px]
        font-bold
        uppercase
        tracking-wider
        text-slate-500
      "
    >
      {status ?? 'Unknown'}
    </span>
  )
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-44 items-center justify-center px-5 py-10">
      <div className="text-center">
        <div className="mx-auto flex w-fit text-slate-300">{icon}</div>

        <p className="mt-3 text-sm font-semibold text-slate-500">{title}</p>

        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  )
}

/* ============================================================
   FORMAT TIME
============================================================ */

function formatTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default FacultyDashboard
