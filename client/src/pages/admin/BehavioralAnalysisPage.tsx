import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Filter,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'

/* ============================================================
   TYPES
============================================================ */

type RiskLevel = 'low' | 'medium' | 'high'

type PersonType = 'student' | 'faculty'

interface BehavioralRecord {
  id: string
  name: string
  login_id: string
  person_type: PersonType
  attendance_rate: number
  punctuality_score: number
  consistency_score: number
  risk_score: number
  risk_level: RiskLevel
}

interface BehavioralSummary {
  total_profiles: number
  average_attendance: number
  average_punctuality: number
  average_consistency: number
  low_risk: number
  medium_risk: number
  high_risk: number
}

/* ============================================================
   DEFAULT DATA
============================================================ */

const EMPTY_SUMMARY: BehavioralSummary = {
  total_profiles: 0,
  average_attendance: 0,
  average_punctuality: 0,
  average_consistency: 0,
  low_risk: 0,
  medium_risk: 0,
  high_risk: 0,
}

/* ============================================================
   PAGE
============================================================ */

function BehavioralAnalysisPage() {
  const [summary, setSummary] = useState<BehavioralSummary>(EMPTY_SUMMARY)

  const [records, setRecords] = useState<BehavioralRecord[]>([])

  const [filter, setFilter] = useState<'all' | PersonType>('all')

  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  /* ==========================================================
     LOAD BEHAVIORAL DATA

     This is intentionally kept ready for your existing
     FastAPI behavioral-analysis endpoint.

     We are NOT inventing an API endpoint here.
  ========================================================== */

  const loadBehavioralData = async () => {
    try {
      setLoading(true)
      setError('')

      /*
       * Connect this function to:
       *
       * server/app/services/behavior_analytics.py
       * server/app/routes/behavior.py
       * server/app/database/models/behavioral_profile.py
       *
       * after confirming the exact API response.
       */

      setSummary(EMPTY_SUMMARY)
      setRecords([])
    } catch (requestError) {
      console.error('Failed to load behavioral analysis:', requestError)

      setError('Unable to load behavioral analysis data.')
    } finally {
      setLoading(false)
    }
  }

  /* ==========================================================
     FILTER RECORDS
  ========================================================== */

  const filteredRecords = records.filter((record) => {
    const matchesPerson = filter === 'all' || record.person_type === filter

    const matchesRisk = riskFilter === 'all' || record.risk_level === riskFilter

    return matchesPerson && matchesRisk
  })

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8 lg:py-7">
      {/* =====================================================
          RAINBOW GLASS BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />

        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />

        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Behavioral Intelligence
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Behavioral Analysis
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Analyze attendance behavior, punctuality, consistency, and attendance-related risk
              across students and faculty.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadBehavioralData()
            }}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-white/75 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={loading ? 'animate-spin text-indigo-600' : 'text-indigo-600'}
            />
            Refresh Analysis
          </button>
        </div>

        {/* ===================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm backdrop-blur-xl">
            <AlertTriangle size={17} />

            {error}
          </div>
        )}

        {/* ===================================================
            SUMMARY CARDS
        ==================================================== */}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users size={19} />}
            title="Behavioral Profiles"
            value={String(summary.total_profiles)}
            description="Analyzed users"
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={<TrendingUp size={19} />}
            title="Attendance Rate"
            value={`${summary.average_attendance.toFixed(1)}%`}
            description="Average attendance"
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            icon={<Clock3 size={19} />}
            title="Punctuality"
            value={`${summary.average_punctuality.toFixed(1)}%`}
            description="Average punctuality"
            iconClass="bg-purple-50 text-purple-600"
          />

          <StatCard
            icon={<Activity size={19} />}
            title="Consistency"
            value={`${summary.average_consistency.toFixed(1)}%`}
            description="Average consistency"
            iconClass="bg-amber-50 text-amber-600"
          />
        </div>

        {/* ===================================================
            RISK OVERVIEW
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-950">Behavioral Risk Overview</h2>

              <p className="text-[10px] text-slate-500">Attendance-related risk distribution</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <RiskCard
              title="Low Risk"
              value={summary.low_risk}
              description="Healthy attendance behavior"
              className="border-emerald-200 bg-emerald-50/70"
              valueClass="text-emerald-700"
            />

            <RiskCard
              title="Medium Risk"
              value={summary.medium_risk}
              description="Requires monitoring"
              className="border-amber-200 bg-amber-50/70"
              valueClass="text-amber-700"
            />

            <RiskCard
              title="High Risk"
              value={summary.high_risk}
              description="Requires intervention"
              className="border-red-200 bg-red-50/70"
              valueClass="text-red-700"
            />
          </div>
        </section>

        {/* ===================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* ATTENDANCE */}

          <AnalyticsCard
            icon={<BarChart3 size={19} />}
            title="Attendance Performance"
            description="Average attendance behavior"
          >
            <MetricBar
              label="Attendance"
              value={summary.average_attendance}
              className="bg-indigo-500"
            />

            <MetricBar
              label="Punctuality"
              value={summary.average_punctuality}
              className="bg-purple-500"
            />

            <MetricBar
              label="Consistency"
              value={summary.average_consistency}
              className="bg-emerald-500"
            />
          </AnalyticsCard>

          {/* RISK */}

          <AnalyticsCard
            icon={<AlertTriangle size={19} />}
            title="Risk Distribution"
            description="Behavioral risk classification"
          >
            <MetricBar
              label="Low Risk"
              value={getPercentage(summary.low_risk, summary.total_profiles)}
              className="bg-emerald-500"
            />

            <MetricBar
              label="Medium Risk"
              value={getPercentage(summary.medium_risk, summary.total_profiles)}
              className="bg-amber-500"
            />

            <MetricBar
              label="High Risk"
              value={getPercentage(summary.high_risk, summary.total_profiles)}
              className="bg-red-500"
            />
          </AnalyticsCard>
        </section>

        {/* ===================================================
            FILTERS
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Filter size={17} className="text-indigo-600" />

                <h2 className="text-sm font-black text-slate-950">Behavioral Records</h2>
              </div>

              <p className="mt-1 text-[10px] text-slate-500">
                Review individual behavioral profiles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </FilterButton>

              <FilterButton active={filter === 'student'} onClick={() => setFilter('student')}>
                Students
              </FilterButton>

              <FilterButton active={filter === 'faculty'} onClick={() => setFilter('faculty')}>
                Faculty
              </FilterButton>
            </div>
          </div>

          {/* RISK FILTER */}

          <div className="mt-4 flex flex-wrap gap-2">
            <FilterButton active={riskFilter === 'all'} onClick={() => setRiskFilter('all')}>
              All Risk
            </FilterButton>

            <FilterButton active={riskFilter === 'low'} onClick={() => setRiskFilter('low')}>
              Low
            </FilterButton>

            <FilterButton active={riskFilter === 'medium'} onClick={() => setRiskFilter('medium')}>
              Medium
            </FilterButton>

            <FilterButton active={riskFilter === 'high'} onClick={() => setRiskFilter('high')}>
              High
            </FilterButton>
          </div>
        </section>

        {/* ===================================================
            TABLE
        ==================================================== */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-white/60">
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Attendance
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Punctuality
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Consistency
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Risk Score
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Risk
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Activity size={21} />
                      </div>

                      <p className="mt-4 text-sm font-black text-slate-800">
                        No behavioral data available
                      </p>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                        Behavioral profiles will appear here once the backend analysis data is
                        available.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <BehavioralTableRow key={record.id} record={record} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================================================
            FOOTER NOTE
        ==================================================== */}

        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <p className="text-[10px] leading-5 text-indigo-800">
            Behavioral scores are generated from attendance patterns including attendance rate,
            punctuality, consistency, and related attendance behavior. They should be used as an
            analytical aid rather than as the sole basis for disciplinary decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  icon,
  title,
  value,
  description,
  iconClass,
}: {
  icon: React.ReactNode
  title: string
  value: string
  description: string
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>

          <p className="mt-1 text-[10px] text-slate-500">{description}</p>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   RISK CARD
============================================================ */

function RiskCard({
  title,
  value,
  description,
  className,
  valueClass,
}: {
  title: string
  value: number
  description: string
  className: string
  valueClass: string
}) {
  return (
    <div className={`rounded-xl border p-5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</p>

      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>

      <p className="mt-1 text-[10px] text-slate-600">{description}</p>
    </div>
  )
}

/* ============================================================
   ANALYTICS CARD
============================================================ */

function AnalyticsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>

          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">{children}</div>
    </div>
  )
}

/* ============================================================
   METRIC BAR
============================================================ */

function MetricBar({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  const safeValue = Math.min(100, Math.max(0, value))

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>

        <span className="text-xs font-black text-slate-900">{safeValue.toFixed(1)}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${className}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}

/* ============================================================
   FILTER BUTTON
============================================================ */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${
        active
          ? 'bg-slate-950 text-white shadow-sm'
          : 'border border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
      }`}
    >
      {children}
    </button>
  )
}

/* ============================================================
   TABLE ROW
============================================================ */

function BehavioralTableRow({ record }: { record: BehavioralRecord }) {
  return (
    <tr className="border-b border-slate-100 transition hover:bg-white/70">
      <td className="px-5 py-4">
        <div>
          <p className="text-xs font-black text-slate-900">{record.name}</p>

          <p className="mt-0.5 text-[10px] text-slate-500">{record.login_id}</p>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold capitalize text-slate-600">
          {record.person_type}
        </span>
      </td>

      <td className="px-5 py-4">
        <Score value={record.attendance_rate} />
      </td>

      <td className="px-5 py-4">
        <Score value={record.punctuality_score} />
      </td>

      <td className="px-5 py-4">
        <Score value={record.consistency_score} />
      </td>

      <td className="px-5 py-4">
        <span className="text-xs font-black text-slate-900">{record.risk_score.toFixed(1)}</span>
      </td>

      <td className="px-5 py-4">
        <RiskBadge level={record.risk_level} />
      </td>
    </tr>
  )
}

/* ============================================================
   SCORE
============================================================ */

function Score({ value }: { value: number }) {
  return <span className="text-xs font-bold text-slate-800">{value.toFixed(1)}%</span>
}

/* ============================================================
   RISK BADGE
============================================================ */

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${styles[level]}`}
    >
      {level}
    </span>
  )
}

/* ============================================================
   PERCENTAGE
============================================================ */

function getPercentage(value: number, total: number) {
  if (!total) {
    return 0
  }

  return (value / total) * 100
}

export default BehavioralAnalysisPage
