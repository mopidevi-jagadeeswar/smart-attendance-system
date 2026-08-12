import { useEffect, useState } from 'react'
import type { ElementType } from 'react'
import type { AxiosError } from 'axios'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  HardDrive,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'

import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'

/* =========================================================
   TYPES
========================================================= */

interface AttendanceTrendItem {
  date: string
  present: number
  absent: number
  late: number
}

interface RecentActivityItem {
  student_name?: string
  student_id?: string
  method?: string
  status?: string
  time?: string
  timestamp?: string
}

interface DashboardData {
  total_students: number
  total_faculty: number
  total_admins: number
  present_today: number
  absent_today: number
  late_today: number
  attendance_percentage: number
  attendance_trend: AttendanceTrendItem[]
  recent_activity: RecentActivityItem[]
}

interface ApiErrorResponse {
  detail?: string
}

/* =========================================================
   STAT CARD
========================================================= */

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: ElementType
  iconColor: string
  valueColor?: string
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  valueColor = 'text-white',
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-white/[0.15] hover:bg-neutral-900/70">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{title}</p>

          <p className={`mt-2 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>

          <p className="mt-1.5 text-[11px] text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-inner ${iconColor}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard() {
  const { user } = useAuth()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  const [loading, setLoading] = useState<boolean>(true)

  const [error, setError] = useState<string | null>(null)

  /* =======================================================
     FETCH DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController()

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.get<DashboardData>('/api/v1/admin/dashboard/summary', {
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setDashboardData(response.data)
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        console.error('Failed to load admin dashboard:', err)

        const axiosError = err as AxiosError<ApiErrorResponse>

        setError(
          axiosError.response?.data?.detail ||
            axiosError.message ||
            'Failed to load dashboard data.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    if (user) {
      void fetchDashboardData()
    } else {
      setLoading(false)
    }

    return () => {
      controller.abort()
    }
  }, [user])

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute h-14 w-14 animate-ping rounded-full bg-red-500/20" />

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Activity size={22} className="animate-pulse text-red-400" />
            </div>
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-300">Loading dashboard...</p>

          <p className="mt-1 text-xs text-slate-500">Fetching live system metrics & nodes</p>
        </div>
      </div>
    )
  }

  /* =======================================================
     ERROR STATE
  ======================================================= */

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
            <AlertTriangle size={22} className="text-red-400" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-white">Unable to load dashboard</h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  /* =======================================================
     SAFE DATA FALLBACKS
  ======================================================= */

  const data: DashboardData = dashboardData ?? {
    total_students: 0,
    total_faculty: 0,
    total_admins: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    attendance_percentage: 0,
    attendance_trend: [],
    recent_activity: [],
  }

  const displayName = user?.full_name || user?.login_id || 'Administrator'

  /* =======================================================
     DASHBOARD CONTENT

     IMPORTANT:
     AdminLayout is intentionally NOT used here.
     AdminLayout already wraps this page through App.tsx.
  ======================================================= */

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* =================================================
          DASHBOARD INTRO
      ================================================== */}

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
              Admin Dashboard
            </p>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            System Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Welcome back, <span className="font-medium text-slate-200">{displayName}</span>. Monitor
            your smart attendance infrastructure and real-time activity.
          </p>
        </div>

        {/* Database Status */}

        <div className="flex w-fit items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 backdrop-blur-md">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

            <span className="relative h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </span>

          <div>
            <p className="text-xs font-semibold text-emerald-400">Database Connected</p>

            <p className="text-[10px] text-slate-500">PostgreSQL Live</p>
          </div>
        </div>
      </section>

      {/* =================================================
          STATISTICS
      ================================================== */}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Registered Students"
          value={data.total_students}
          description="Active student accounts"
          icon={Users}
          iconColor="text-blue-400 bg-blue-500/10 border-blue-500/20"
        />

        <StatCard
          title="Registered Faculty"
          value={data.total_faculty}
          description="Active faculty members"
          icon={UserCheck}
          iconColor="text-violet-400 bg-violet-500/10 border-violet-500/20"
        />

        <StatCard
          title="Administrators"
          value={data.total_admins}
          description="System administrators"
          icon={ShieldCheck}
          iconColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />

        <StatCard
          title="Today's Attendance"
          value={`${data.attendance_percentage}%`}
          description="Overall verification rate"
          icon={ClipboardCheck}
          iconColor="text-orange-400 bg-orange-500/10 border-orange-500/20"
          valueColor="text-orange-400"
        />
      </section>

      {/* =================================================
          ATTENDANCE OVERVIEW + TREND
      ================================================== */}

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Today's Attendance */}

        <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Today's Attendance</h2>

              <p className="mt-1 text-xs text-slate-400">
                Current attendance verification breakdown.
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <ClipboardCheck size={20} />
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between">
            <div>
              <p className="text-4xl font-extrabold text-white">{data.attendance_percentage}%</p>

              <p className="mt-1 text-xs text-slate-500">Overall success rate</p>
            </div>

            <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-400">
              Live Status
            </span>
          </div>

          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-all duration-700"
              style={{
                width: `${Math.min(Math.max(data.attendance_percentage, 0), 100)}%`,
              }}
            />
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="text-xs text-slate-400">Present</p>

              <p className="mt-1.5 text-2xl font-bold text-emerald-400">{data.present_today}</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="text-xs text-slate-400">Absent</p>

              <p className="mt-1.5 text-2xl font-bold text-red-400">{data.absent_today}</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="text-xs text-slate-400">Late</p>

              <p className="mt-1.5 text-2xl font-bold text-amber-400">{data.late_today}</p>
            </div>
          </div>
        </div>

        {/* Attendance Trend */}

        <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Attendance Trend</h2>

              <p className="mt-1 text-xs text-slate-400">Historical daily attendance trends.</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <BarChart3 size={20} />
            </div>
          </div>

          {data.attendance_trend.length === 0 ? (
            <div className="flex h-52 items-center justify-center">
              <div className="text-center">
                <BarChart3 size={32} className="mx-auto text-slate-600" />

                <p className="mt-3 text-xs text-slate-500">
                  No attendance trend data recorded yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {data.attendance_trend.slice(-7).map((item) => {
                const total = item.present + item.absent + item.late

                const percentage = total > 0 ? (item.present / total) * 100 : 0

                return (
                  <div key={item.date} className="group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-400">{item.date}</span>

                      <span className="font-semibold text-slate-200">
                        {Math.round(percentage)}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 group-hover:brightness-125"
                        style={{
                          width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          SYSTEM MANAGEMENT + HARDWARE
      ================================================== */}

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* System Management */}

        <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">System Management</h2>

              <p className="mt-1 text-xs text-slate-400">Quick shortcuts to admin modules.</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3.5">
            <Link
              to="/admin/students"
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/[0.04]"
            >
              <Users
                size={20}
                className="text-blue-400 transition-transform group-hover:scale-110"
              />

              <p className="mt-3 text-sm font-semibold text-white">Students</p>

              <p className="mt-0.5 text-[11px] text-slate-500">Manage student records</p>
            </Link>

            <Link
              to="/admin/faculty"
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/[0.04]"
            >
              <UserCheck
                size={20}
                className="text-violet-400 transition-transform group-hover:scale-110"
              />

              <p className="mt-3 text-sm font-semibold text-white">Faculty</p>

              <p className="mt-0.5 text-[11px] text-slate-500">Manage faculty staff</p>
            </Link>

            <Link
              to="/admin/attendance"
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/[0.04]"
            >
              <Database
                size={20}
                className="text-emerald-400 transition-transform group-hover:scale-110"
              />

              <p className="mt-3 text-sm font-semibold text-white">Attendance Logs</p>

              <p className="mt-0.5 text-[11px] text-slate-500">Inspect real-time logs</p>
            </Link>

            <Link
              to="/admin/reports"
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/[0.04]"
            >
              <FileText
                size={20}
                className="text-orange-400 transition-transform group-hover:scale-110"
              />

              <p className="mt-3 text-sm font-semibold text-white">Reports</p>

              <p className="mt-0.5 text-[11px] text-slate-500">Export CSV / PDF reports</p>
            </Link>
          </div>
        </div>

        {/* Hardware & Node Status */}

        <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Hardware & Node Status</h2>

              <p className="mt-1 text-xs text-slate-400">Connected attendance & camera nodes.</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Activity size={20} />
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <HardDrive size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Gate A — NFC & Face Node</p>

                  <p className="text-[10px] text-slate-500">Hardware verification endpoint</p>
                </div>
              </div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <HardDrive size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">Face Recognition Service</p>

                  <p className="text-[10px] text-slate-500">OpenCV Camera Stream Active</p>
                </div>
              </div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                Online
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                  <Database size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium text-white">FastAPI Backend API</p>

                  <p className="text-[10px] text-slate-500">REST API & WebSocket service</p>
                </div>
              </div>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                Online
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          RECENT ACTIVITY
      ================================================== */}

      <section className="mt-6 rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Attendance Activity</h2>

            <p className="mt-1 text-xs text-slate-400">Live feed of student verification events.</p>
          </div>

          <Link
            to="/admin/history"
            className="text-xs font-semibold text-red-400 transition hover:text-red-300"
          >
            View Full History →
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          {data.recent_activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={32} className="text-slate-600" />

              <p className="mt-3 text-xs text-slate-500">No recent activity events recorded.</p>
            </div>
          ) : (
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Student
                  </th>

                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Verification Method
                  </th>

                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Timestamp
                  </th>

                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.04]">
                {data.recent_activity.map((activity, index) => (
                  <tr
                    key={`${activity.student_id ?? 'activity'}-${index}`}
                    className="group hover:bg-white/[0.02]"
                  >
                    <td className="py-4">
                      <p className="text-xs font-semibold text-white">
                        {activity.student_name || activity.student_id || 'Unknown Student'}
                      </p>

                      {activity.student_id && (
                        <p className="mt-0.5 text-[10px] text-slate-500">{activity.student_id}</p>
                      )}
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium ${
                          activity.method?.toLowerCase().includes('nfc')
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                            : 'border-red-500/20 bg-red-500/10 text-red-400'
                        }`}
                      >
                        {activity.method || 'Face Recognition'}
                      </span>
                    </td>

                    <td className="py-4 text-xs text-slate-300">
                      {activity.time || activity.timestamp || '--'}
                    </td>

                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                        <CheckCircle2 size={12} />

                        {activity.status || 'Verified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* =================================================
          BEHAVIORAL ANALYTICS
      ================================================== */}

      <section className="mt-6 rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-amber-400" />

              <h2 className="text-base font-semibold text-white">
                Behavioral Analytics & Anomalies
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              AI-powered behavioral deviation tracking for smart attendance.
            </p>
          </div>

          <span className="flex w-fit items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] font-semibold text-amber-400">
            <AlertTriangle size={13} />
            System Active
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

            <p className="text-xs font-medium text-slate-200">
              Behavioral pattern analysis is running smoothly.
            </p>
          </div>

          <p className="mt-2 pl-5 text-[11px] text-slate-500">
            Any irregular check-in patterns or anomalies detected by the behavioral analytics engine
            will be logged here.
          </p>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
