import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileBarChart,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { Link } from 'react-router-dom'

import apiClient from '../../api/client'
import { useAuth } from '../../context/AuthContext'

/* ============================================================
   TYPES
============================================================ */

interface ReportSummary {
  total_records: number
  present: number
  late: number
  absent: number
  attendance_rate: number
  students: number
  faculty: number
}

interface AttendanceRecord {
  id: string
  name: string
  person_id: string
  role: 'student' | 'faculty'
  date: string
  time: string
  method: string
  status: 'present' | 'late' | 'absent'
}

interface ReportsResponse {
  summary: ReportSummary
  records: AttendanceRecord[]
}

/* ============================================================
   DEFAULT SUMMARY
============================================================ */

const EMPTY_SUMMARY: ReportSummary = {
  total_records: 0,
  present: 0,
  late: 0,
  absent: 0,
  attendance_rate: 0,
  students: 0,
  faculty: 0,
}

/* ============================================================
   ADMIN DASHBOARD
============================================================ */

function AdminDashboard() {
  const { user } = useAuth()

  const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY)

  const [records, setRecords] = useState<AttendanceRecord[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  /* ==========================================================
     ADMIN NAME
  ========================================================== */

  const displayName = user?.full_name?.trim() || user?.login_id || 'Administrator'

  /* ==========================================================
     LOAD LIVE REPORT DATA
  ========================================================== */

  const loadReports = useCallback(async () => {
    try {
      setError('')

      const response = await apiClient.get<ReportsResponse>('/admin/reports')

      const responseSummary = response.data?.summary ?? EMPTY_SUMMARY

      const responseRecords = Array.isArray(response.data?.records) ? response.data.records : []

      setSummary({
        total_records: Number(responseSummary.total_records ?? 0),

        present: Number(responseSummary.present ?? 0),

        late: Number(responseSummary.late ?? 0),

        absent: Number(responseSummary.absent ?? 0),

        attendance_rate: Number(responseSummary.attendance_rate ?? 0),

        students: Number(responseSummary.students ?? 0),

        faculty: Number(responseSummary.faculty ?? 0),
      })

      setRecords(responseRecords)
    } catch (requestError) {
      console.error('Failed to load admin dashboard reports:', requestError)

      let message = 'Unable to load dashboard data.'

      if (typeof requestError === 'object' && requestError !== null && 'response' in requestError) {
        const axiosError = requestError as {
          response?: {
            status?: number
            data?: {
              detail?: string
            }
          }
          message?: string
        }

        if (axiosError.response?.status === 401) {
          message = 'Your admin session has expired. Please log in again.'
        } else if (axiosError.response?.status === 403) {
          message = 'You do not have permission to view dashboard reports.'
        } else if (axiosError.response?.status === 404) {
          message = 'The /admin/reports endpoint was not found.'
        } else if (axiosError.response?.data?.detail) {
          message = axiosError.response.data.detail
        } else if (axiosError.message) {
          message = axiosError.message
        }
      }

      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    const initializeDashboard = async () => {
      await Promise.resolve().then(() => loadReports())
    }

    void initializeDashboard()
  }, [loadReports])

  /* ==========================================================
     AUTO REFRESH
     Refresh every 30 seconds
  ========================================================== */

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadReports()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loadReports])

  /* ==========================================================
     STATUS CHART
  ========================================================== */

  const statusChartData = useMemo(
    () => [
      {
        name: 'Present',
        count: records.filter((record) => record.status === 'present').length,
      },
      {
        name: 'Late',
        count: records.filter((record) => record.status === 'late').length,
      },
      {
        name: 'Absent',
        count: records.filter((record) => record.status === 'absent').length,
      },
    ],
    [records]
  )

  /* ==========================================================
     ROLE CHART
  ========================================================== */

  const roleChartData = useMemo(
    () => [
      {
        name: 'Students',
        count: records.filter((record) => record.role === 'student').length,
      },
      {
        name: 'Faculty',
        count: records.filter((record) => record.role === 'faculty').length,
      },
    ],
    [records]
  )

  /* ==========================================================
     METHOD CHART
  ========================================================== */

  const methodChartData = useMemo(() => {
    const counts: Record<string, number> = {}

    records.forEach((record) => {
      const method = record.method?.trim()
        ? record.method.charAt(0).toUpperCase() + record.method.slice(1)
        : 'Unknown'

      counts[method] = (counts[method] ?? 0) + 1
    })

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }))
  }, [records])

  /* ==========================================================
     TREND CHART
  ========================================================== */

  const trendChartData = useMemo(() => {
    const grouped: Record<
      string,
      {
        present: number
        late: number
        absent: number
      }
    > = {}

    records.forEach((record) => {
      if (!grouped[record.date]) {
        grouped[record.date] = {
          present: 0,
          late: 0,
          absent: 0,
        }
      }

      if (record.status === 'present') {
        grouped[record.date].present += 1
      }

      if (record.status === 'late') {
        grouped[record.date].late += 1
      }

      if (record.status === 'absent') {
        grouped[record.date].absent += 1
      }
    })

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-10)
      .map(([date, values]) => ({
        date: formatShortDate(date),
        present: values.present,
        late: values.late,
        absent: values.absent,
      }))
  }, [records])

  /* ==========================================================
     TODAY'S RECORDS
  ========================================================== */

  const todayRecords = useMemo(() => {
    const today = new Date()

    const todayString =
      `${today.getFullYear()}-` +
      `${String(today.getMonth() + 1).padStart(2, '0')}-` +
      `${String(today.getDate()).padStart(2, '0')}`

    return records.filter((record) => record.date === todayString)
  }, [records])

  /* ==========================================================
     TODAY STATUS
  ========================================================== */

  const todayPresent = useMemo(
    () => todayRecords.filter((record) => record.status === 'present').length,
    [todayRecords]
  )

  const todayLate = useMemo(
    () => todayRecords.filter((record) => record.status === 'late').length,
    [todayRecords]
  )

  const todayAbsent = useMemo(
    () => todayRecords.filter((record) => record.status === 'absent').length,
    [todayRecords]
  )

  /* ==========================================================
     LOADING STATE
  ========================================================== */

  if (loading) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-slate-100">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-pink-300/25 blur-3xl" />

        <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl" />

        <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative z-10 rounded-2xl border border-white/80 bg-white/70 px-10 py-8 text-center shadow-xl backdrop-blur-2xl">
          <Loader2 size={32} className="mx-auto animate-spin text-indigo-600" />

          <p className="mt-4 text-sm font-bold text-slate-900">Loading dashboard</p>

          <p className="mt-1 text-xs text-slate-500">Fetching live attendance data...</p>
        </div>
      </div>
    )
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-100 pb-10 text-slate-950">
      {/* ======================================================
          RAINBOW BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-pink-300/25 blur-3xl" />

        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />

        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Admin Dashboard
              </p>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              System Overview
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Welcome back, <span className="font-bold text-slate-900">{displayName}</span>. Monitor
              your attendance system using live database data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* LIVE STATUS */}

            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>

              <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
            </div>

            {/* REFRESH */}

            <button
              type="button"
              onClick={() => {
                void loadReports()
              }}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white/70 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
            >
              <RefreshCw size={14} className="text-indigo-600" />
              Refresh
            </button>
          </div>
        </section>

        {/* ====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm backdrop-blur-xl">
            <AlertTriangle size={17} />

            <span>{error}</span>
          </div>
        )}

        {/* ====================================================
            LIVE SUMMARY
        ===================================================== */}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Records"
            value={summary.total_records}
            description="Attendance records"
            icon={BarChart3}
            iconColor="text-indigo-600"
            iconBackground="bg-indigo-50"
          />

          <StatCard
            title="Present"
            value={summary.present}
            description="Verified attendance"
            icon={CheckCircle2}
            iconColor="text-emerald-600"
            iconBackground="bg-emerald-50"
            valueColor="text-emerald-600"
          />

          <StatCard
            title="Late"
            value={summary.late}
            description="Late attendance"
            icon={Clock3}
            iconColor="text-amber-600"
            iconBackground="bg-amber-50"
            valueColor="text-amber-600"
          />

          <StatCard
            title="Absent"
            value={summary.absent}
            description="Absent records"
            icon={XCircle}
            iconColor="text-red-600"
            iconBackground="bg-red-50"
            valueColor="text-red-600"
          />
        </section>

        {/* ====================================================
            PEOPLE + ATTENDANCE RATE
        ===================================================== */}

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* Attendance Rate */}

          <div className="rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Attendance Rate
                </p>

                <p className="mt-2 text-3xl font-black text-slate-950">
                  {summary.attendance_rate.toFixed(1)}%
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-linear-to-r from-pink-500 via-indigo-500 to-cyan-400 transition-all duration-700"
                style={{
                  width: `${Math.min(Math.max(summary.attendance_rate, 0), 100)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[10px] font-medium text-slate-500">
              Calculated from live attendance records.
            </p>
          </div>

          {/* Students */}

          <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <Users size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Students
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">{summary.students}</p>

                <p className="text-[10px] font-medium text-slate-500">Attendance participants</p>
              </div>
            </div>
          </div>

          {/* Faculty */}

          <div className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50/60 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-purple-600 shadow-sm">
                <UserRound size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Faculty
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">{summary.faculty}</p>

                <p className="text-[10px] font-medium text-slate-500">Attendance participants</p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            TODAY'S ATTENDANCE
        ===================================================== */}

        <section className="mt-5 rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Today's Attendance</h2>

              <p className="mt-1 text-xs text-slate-500">Live records received for today.</p>
            </div>

            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <TodayCard title="Present" value={todayPresent} color="emerald" />

            <TodayCard title="Late" value={todayLate} color="amber" />

            <TodayCard title="Absent" value={todayAbsent} color="red" />
          </div>
        </section>

        {/* ====================================================
            CHARTS
        ===================================================== */}

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          {/* Attendance Trend */}

          <ChartCard
            title="Attendance Trend"
            subtitle="Live daily attendance records"
            icon={<TrendingUp size={17} />}
          >
            {trendChartData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendChartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 9,
                      fill: '#64748b',
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 9,
                      fill: '#64748b',
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: 'rgba(255,255,255,0.96)',
                      boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                      fontSize: '10px',
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: '10px',
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="late"
                    name="Late"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Status */}

          <ChartCard
            title="Attendance Status"
            subtitle="Live present, late, and absent distribution"
            icon={<BarChart3 size={17} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 9,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 9,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.15)',
                    background: 'rgba(255,255,255,0.96)',
                    fontSize: '10px',
                  }}
                />

                <Bar dataKey="count" name="Records" radius={[7, 7, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'Present'
                          ? '#10b981'
                          : entry.name === 'Late'
                            ? '#f59e0b'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Role */}

          <ChartCard
            title="Attendance by Role"
            subtitle="Live student and faculty records"
            icon={<Users size={17} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roleChartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: -15,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 9,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 9,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.15)',
                    background: 'rgba(255,255,255,0.96)',
                    fontSize: '10px',
                  }}
                />

                <Bar dataKey="count" name="Records" radius={[8, 8, 0, 0]}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Methods */}

          <ChartCard
            title="Attendance Methods"
            subtitle="Live verification method distribution"
            icon={<PieChartIcon size={17} />}
          >
            {methodChartData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {methodChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={['#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b'][index % 4]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: 'rgba(255,255,255,0.96)',
                      fontSize: '10px',
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: '10px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>

        {/* ====================================================
            REPORTS
        ===================================================== */}

        <section className="mt-5 rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <FileBarChart size={18} className="text-indigo-600" />

                <h2 className="text-base font-black text-slate-950">Reports & Analytics</h2>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                All report statistics above are loaded from the live Reports API.
              </p>
            </div>

            <Link
              to="/admin/reports"
              className="flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              <FileBarChart size={14} />
              Open Full Reports
            </Link>
          </div>
        </section>

        {/* ====================================================
            RECENT LIVE RECORDS
        ===================================================== */}

        <section className="mt-5 rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Recent Attendance</h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest records received from the Reports API.
              </p>
            </div>

            <Link
              to="/admin/history"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View History →
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <BarChart3 size={30} className="text-slate-300" />

                <p className="mt-3 text-xs font-semibold text-slate-500">
                  No attendance records found.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-180 text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Person
                    </th>

                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Role
                    </th>

                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Time
                    </th>

                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Method
                    </th>

                    <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.slice(0, 10).map((record) => (
                    <tr key={record.id} className="transition hover:bg-indigo-50/50">
                      <td className="py-3.5">
                        <p className="text-xs font-bold text-slate-900">{record.name}</p>

                        <p className="mt-0.5 text-[10px] text-slate-500">{record.person_id}</p>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[9px] font-bold ${
                            record.role === 'student'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {capitalize(record.role)}
                        </span>
                      </td>

                      <td className="py-3.5 text-xs font-medium text-slate-600">
                        {formatShortDate(record.date)}
                      </td>

                      <td className="py-3.5 text-xs font-medium text-slate-600">
                        {record.time || '--'}
                      </td>

                      <td className="py-3.5">
                        <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-700">
                          {record.method || 'Unknown'}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
  valueColor = 'text-slate-950',
}: {
  title: string
  value: number
  description: string
  icon: typeof BarChart3
  iconColor: string
  iconBackground: string
  valueColor?: string
}) {
  return (
    <div className="rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            {title}
          </p>

          <p className={`mt-2 text-3xl font-black tracking-tight ${valueColor}`}>{value}</p>

          <p className="mt-1 text-[10px] font-medium text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBackground} ${iconColor}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   TODAY CARD
============================================================ */

function TodayCard({
  title,
  value,
  color,
}: {
  title: string
  value: number
  color: 'emerald' | 'amber' | 'red'
}) {
  const styles = {
    emerald: {
      box: 'border-emerald-100 bg-emerald-50/70',
      value: 'text-emerald-600',
    },

    amber: {
      box: 'border-amber-100 bg-amber-50/70',
      value: 'text-amber-600',
    },

    red: {
      box: 'border-red-100 bg-red-50/70',
      value: 'text-red-600',
    },
  }

  return (
    <div className={`rounded-xl border p-5 ${styles[color].box}`}>
      <p className="text-xs font-semibold text-slate-500">{title}</p>

      <p className={`mt-2 text-3xl font-black ${styles[color].value}`}>{value}</p>
    </div>
  )
}

/* ============================================================
   CHART CARD
============================================================ */

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/75 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>

          <p className="mt-1 text-[10px] font-medium text-slate-500">{subtitle}</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
      </div>

      <div className="mt-4 h-64">{children}</div>
    </div>
  )
}

/* ============================================================
   CHART EMPTY
============================================================ */

function ChartEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <BarChart3 size={19} />
      </div>

      <p className="mt-3 text-xs font-bold text-slate-600">No graph data available</p>

      <p className="mt-1 text-[10px] text-slate-400">Attendance records will appear here.</p>
    </div>
  )
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({ status }: { status: AttendanceRecord['status'] }) {
  if (status === 'present') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
        <CheckCircle2 size={11} />
        Present
      </span>
    )
  }

  if (status === 'late') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700">
        <Clock3 size={11} />
        Late
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-bold text-red-700">
      <XCircle size={11} />
      Absent
    </span>
  )
}

/* ============================================================
   DATE FORMATTER
============================================================ */

function formatShortDate(value: string): string {
  if (!value) {
    return '--'
  }

  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

/* ============================================================
   CAPITALIZE
============================================================ */

function capitalize(value: string): string {
  if (!value) {
    return '--'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

/* ============================================================
   EXPORT
============================================================ */

export default AdminDashboard
