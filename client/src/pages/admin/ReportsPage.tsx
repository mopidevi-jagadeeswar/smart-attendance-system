import axios from 'axios'
import {
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
import { useCallback, useEffect, useMemo, useState } from 'react'

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

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// API
// ============================================================

const API_BASE_URL = 'http://localhost:8000'
const REPORTS_URL = `${API_BASE_URL}/admin/reports`

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return (
        'Unable to connect to the FastAPI server. ' +
        'Make sure the backend is running on port 8000.'
      )
    }

    if (error.response?.status === 401) {
      return 'Your admin session has expired. Please log in again.'
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to view reports.'
    }

    if (error.response?.status === 404) {
      return 'Reports API endpoint was not found.'
    }

    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to load reports. Please try again.'
}

async function fetchReportsData(): Promise<ReportsResponse> {
  const token = getAccessToken()

  if (!token) {
    throw new Error('Authentication token not found. Please log in again.')
  }

  const response = await axios.get<ReportsResponse>(REPORTS_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
    timeout: 15000,
  })

  return response.data
}

// ============================================================
// PAGE
// ============================================================

function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary>({
    total_records: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendance_rate: 0,
    students: 0,
    faculty: 0,
  })

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================================
  // LOAD REPORTS
  // ==========================================================

  // Manual refresh logic
  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchReportsData()
      setSummary(data.summary)
      setRecords(data.records)
    } catch (requestError) {
      console.error('Failed to load reports:', requestError)
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load logic avoiding synchronous setState in effect
  useEffect(() => {
    let ignore = false

    const init = async () => {
      try {
        const data = await fetchReportsData()
        if (!ignore) {
          setSummary(data.summary)
          setRecords(data.records)
          setLoading(false)
        }
      } catch (requestError) {
        if (!ignore) {
          console.error('Failed to load reports:', requestError)
          setError(getApiError(requestError))
          setLoading(false)
        }
      }
    }

    void init()

    return () => {
      ignore = true
    }
  }, [])

  // ==========================================================
  // GRAPH DATA
  // ==========================================================

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

  const methodChartData = useMemo(() => {
    const counts: Record<string, number> = {}

    records.forEach((record) => {
      const method = record.method
        ? record.method.charAt(0).toUpperCase() + record.method.slice(1)
        : 'Unknown'

      counts[method] = (counts[method] ?? 0) + 1
    })

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }))
  }, [records])

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
      .map(([date, values]) => ({
        date: formatShortDate(date),
        present: values.present,
        late: values.late,
        absent: values.absent,
      }))
  }, [records])

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-linear-to-br from-slate-100 via-indigo-50 to-sky-50 text-slate-900">
      {/* Background glow */}

      <div className="pointer-events-none fixed -left-32 top-10 h-80 w-80 rounded-full bg-indigo-400/15 blur-[120px]" />
      <div className="pointer-events-none fixed right-0 top-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-400/10 blur-[130px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl flex-col px-4 py-4 sm:px-5 lg:px-6">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <section className="mb-4 flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 px-5 py-3.5 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <FileBarChart size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-700">
                Administration
              </p>

              <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">
                Attendance Reports
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Overview and attendance analytics at a glance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-indigo-500/20 bg-white/60 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin text-indigo-600" />
            ) : (
              <RefreshCw size={15} className="text-indigo-600" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </section>

        {/* ====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mb-4 shrink-0 rounded-xl border border-red-400/30 bg-red-50/80 px-4 py-2.5 text-xs font-medium text-red-700 shadow-sm backdrop-blur-xl">
            {error}
          </div>
        )}

        {/* ====================================================
            OVERVIEW
        ===================================================== */}

        <section className="mb-4 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <ReportStatCard
            title="Total Records"
            value={summary.total_records}
            icon={<BarChart3 size={18} />}
            className="border-indigo-500/20 from-indigo-500/15 to-blue-500/5 text-indigo-600"
          />

          <ReportStatCard
            title="Present"
            value={summary.present}
            icon={<CheckCircle2 size={18} />}
            className="border-emerald-500/20 from-emerald-500/15 to-teal-500/5 text-emerald-600"
          />

          <ReportStatCard
            title="Late"
            value={summary.late}
            icon={<Clock3 size={18} />}
            className="border-amber-500/20 from-amber-500/15 to-orange-500/5 text-amber-600"
          />

          <ReportStatCard
            title="Absent"
            value={summary.absent}
            icon={<XCircle size={18} />}
            className="border-red-500/20 from-red-500/15 to-pink-500/5 text-red-600"
          />
        </section>

        {/* ====================================================
            OVERVIEW STRIP
        ===================================================== */}

        <section className="mb-4 grid shrink-0 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="rounded-2xl border border-indigo-500/15 bg-white/50 px-5 py-3.5 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Attendance Rate
                </p>

                <p className="mt-0.5 text-2xl font-black text-slate-950">
                  {summary.attendance_rate.toFixed(1)}%
                </p>
              </div>

              <div className="flex-1 max-w-xs">
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500 transition-all duration-700"
                    style={{
                      width: `${Math.min(Math.max(summary.attendance_rate, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>

              <TrendingUp size={20} className="shrink-0 text-indigo-600" />
            </div>
          </div>

          <PeopleOverview
            label="Students"
            value={summary.students}
            icon={<UserRound size={17} />}
            className="bg-blue-500/10 text-blue-600"
          />

          <PeopleOverview
            label="Faculty"
            value={summary.faculty}
            icon={<Users size={17} />}
            className="bg-purple-500/10 text-purple-600"
          />
        </section>

        {/* ====================================================
            GRAPHS — ALL FIT IN ONE PAGE
        ===================================================== */}

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Attendance Trend */}

          <ChartCard
            title="Attendance Trend"
            subtitle="Daily present, late, and absent activity"
            icon={<TrendingUp size={17} />}
          >
            {loading ? (
              <ChartLoading />
            ) : trendChartData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendChartData}
                  margin={{
                    top: 8,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: 'rgba(255,255,255,0.96)',
                      boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
                      fontSize: '10px',
                    }}
                  />

                  <Legend wrapperStyle={{ fontSize: '10px' }} />

                  <Line
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="late"
                    name="Late"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Status */}

          <ChartCard
            title="Attendance Status"
            subtitle="Present, late, and absent distribution"
            icon={<BarChart3 size={17} />}
          >
            {loading ? (
              <ChartLoading />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  margin={{
                    top: 8,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
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
            )}
          </ChartCard>

          {/* Role */}

          <ChartCard
            title="Attendance by Role"
            subtitle="Student and faculty attendance records"
            icon={<Users size={17} />}
          >
            {loading ? (
              <ChartLoading />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roleChartData}
                  margin={{
                    top: 8,
                    right: 15,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: 'rgba(255,255,255,0.96)',
                      fontSize: '10px',
                    }}
                  />

                  <Bar dataKey="count" name="Attendance Records" radius={[8, 8, 0, 0]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Method */}

          <ChartCard
            title="Attendance Methods"
            subtitle="Face, NFC, and other verification methods"
            icon={<PieChartIcon size={17} />}
          >
            {loading ? (
              <ChartLoading />
            ) : methodChartData.length === 0 ? (
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
                      borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: 'rgba(255,255,255,0.96)',
                      fontSize: '10px',
                    }}
                  />

                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>
      </div>
    </div>
  )
}

// ============================================================
// CHART CARD
// ============================================================

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-indigo-500/15 bg-white/50 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-400/10 blur-3xl" />

      <div className="relative flex shrink-0 items-center justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-slate-500">
            Analytics
          </p>

          <h2 className="mt-0.5 truncate text-base font-black text-slate-950">{title}</h2>

          <p className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
          {icon}
        </div>
      </div>

      <div className="relative mt-2 min-h-52.5 flex-1">{children}</div>
    </div>
  )
}

// ============================================================
// REPORT STAT CARD
// ============================================================

function ReportStatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string
  value: number
  icon: React.ReactNode
  className: string
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br p-3.5 shadow-lg backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${className}`}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-current opacity-[0.05] blur-2xl transition group-hover:scale-150" />

      <div className="relative flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/50">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PEOPLE OVERVIEW
// ============================================================

function PeopleOverview({
  label,
  value,
  icon,
  className,
}: {
  label: string
  value: number
  icon: React.ReactNode
  className: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/50 px-4 py-3.5 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${className}`}>
          {icon}
        </div>

        <span className="text-xs font-bold text-slate-700">{label}</span>
      </div>

      <span className="text-xl font-black text-slate-950">{value}</span>
    </div>
  )
}

// ============================================================
// CHART LOADING
// ============================================================

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 size={23} className="animate-spin text-indigo-500" />
        <p className="text-[10px] font-medium text-slate-500">Loading graph...</p>
      </div>
    </div>
  )
}

// ============================================================
// CHART EMPTY
// ============================================================

function ChartEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400">
        <BarChart3 size={19} />
      </div>

      <p className="mt-2 text-[11px] font-bold text-slate-600">No graph data available</p>

      <p className="mt-0.5 text-[9px] text-slate-400">Attendance records will appear here.</p>
    </div>
  )
}

// ============================================================
// DATE FORMATTER
// ============================================================

function formatShortDate(value: string): string {
  if (!value) {
    return 'Unknown'
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

// ============================================================
// EXPORT
// ============================================================

export default ReportsPage
