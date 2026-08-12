import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

type AttendanceStatus = 'Present' | 'Late' | 'Absent'

type AttendanceMethod = 'Face' | 'NFC' | 'Manual'

type PersonType = 'Student' | 'Faculty'

type AttendanceRecord = {
  id: string
  date: string
  time: string
  name: string
  personId: string
  personType: PersonType
  department: string
  method: AttendanceMethod
  status: AttendanceStatus
  checkIn: string
  checkOut: string
  confidence: number | null
}

type BackendHistoryRecord = {
  id: string
  date: string
  time: string
  person_type: string
  student_id: string | null
  faculty_id: string | null
  name: string
  department: string | null
  method: string
  status: string
  check_in: string | null
  check_out: string | null
  confidence: number | null
  device_id?: string | null
}

type BackendSummary = {
  total_records: number
  present: number
  late: number
  absent: number
  attendance_rate: number
}

type BackendHistoryResponse = {
  records: BackendHistoryRecord[]
  page: number
  page_size: number
  total_records: number
  total_pages: number
  summary: BackendSummary
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const PAGE_SIZE = 50

// ============================================================
// HELPERS
// ============================================================

function normalizeStatus(value: string): AttendanceStatus {
  switch (value.toLowerCase()) {
    case 'late':
      return 'Late'

    case 'absent':
      return 'Absent'

    default:
      return 'Present'
  }
}

function normalizeMethod(value: string): AttendanceMethod {
  switch (value.toLowerCase()) {
    case 'nfc':
      return 'NFC'

    case 'manual':
      return 'Manual'

    default:
      return 'Face'
  }
}

function normalizePersonType(value: string): PersonType {
  return value.toLowerCase() === 'faculty' ? 'Faculty' : 'Student'
}

function formatDate(value: string): string {
  if (!value) {
    return '--'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(value: string | null): string {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapBackendRecord(record: BackendHistoryRecord): AttendanceRecord {
  return {
    id: record.id,
    date: formatDate(record.date),
    time: record.time || formatTime(record.check_in),
    name: record.name || 'Unknown Person',
    personId: record.student_id ?? record.faculty_id ?? '--',
    personType: normalizePersonType(record.person_type),
    department: record.department ?? '--',
    method: normalizeMethod(record.method),
    status: normalizeStatus(record.status),
    checkIn: formatTime(record.check_in),
    checkOut: formatTime(record.check_out),
    confidence: record.confidence,
  }
}

// ============================================================
// PAGE
// ============================================================

function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  const [summary, setSummary] = useState<BackendSummary>({
    total_records: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendance_rate: 0,
  })

  const [search, setSearch] = useState('')

  const [personType, setPersonType] = useState('All')

  const [status, setStatus] = useState('All')

  const [method, setMethod] = useState('All')

  const [fromDate, setFromDate] = useState('')

  const [toDate, setToDate] = useState('')

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

  const [page, setPage] = useState(1)

  const [totalRecords, setTotalRecords] = useState(0)

  const [totalPages, setTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  // ============================================================
  // FETCH BACKEND DATA
  // ============================================================

  const fetchHistory = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      /*
       * Important:
       * Yield before changing state.
       *
       * This avoids the React
       * react-hooks/set-state-in-effect
       * lint error when this function is
       * triggered from useEffect.
       */
      await Promise.resolve()

      if (signal?.aborted) {
        return
      }

      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (fromDate) {
          params.set('from_date', fromDate)
        }

        if (toDate) {
          params.set('to_date', toDate)
        }

        if (personType !== 'All') {
          params.set('person_type', personType.toLowerCase())
        }

        if (status !== 'All') {
          params.set('status', status.toLowerCase())
        }

        if (method !== 'All') {
          params.set('method', method.toLowerCase())
        }

        if (search.trim()) {
          params.set('search', search.trim())
        }

        params.set('page', String(page))

        params.set('page_size', String(PAGE_SIZE))

        const query = params.toString()

        const response = await fetch(`${API_BASE_URL}/api/v1/admin/history?${query}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal,
        })

        if (!response.ok) {
          let message = `Failed to load attendance history (${response.status}).`

          try {
            const body = (await response.json()) as {
              detail?: string
            }

            if (body.detail) {
              message = body.detail
            }
          } catch {
            // Keep default message.
          }

          throw new Error(message)
        }

        const data = (await response.json()) as BackendHistoryResponse

        if (signal?.aborted) {
          return
        }

        setRecords(data.records.map(mapBackendRecord))

        setSummary(data.summary)

        setTotalRecords(data.total_records)

        setTotalPages(Math.max(1, data.total_pages))
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }

        if (signal?.aborted) {
          return
        }

        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load attendance history.'

        setError(message)

        setRecords([])

        setSummary({
          total_records: 0,
          present: 0,
          late: 0,
          absent: 0,
          attendance_rate: 0,
        })

        setTotalRecords(0)
        setTotalPages(1)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [fromDate, method, page, personType, search, status, toDate]
  )

  // ============================================================
  // LOAD BACKEND DATA
  // ============================================================

  useEffect(() => {
    const controller = new AbortController()

    const load = async (): Promise<void> => {
      await fetchHistory(controller.signal)
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [fetchHistory])

  // ============================================================
  // FILTER HANDLERS
  // ============================================================

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleFromDateChange = (value: string) => {
    setFromDate(value)
    setPage(1)
  }

  const handleToDateChange = (value: string) => {
    setToDate(value)
    setPage(1)
  }

  const handlePersonTypeChange = (value: string) => {
    setPersonType(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const handleMethodChange = (value: string) => {
    setMethod(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setPersonType('All')
    setStatus('All')
    setMethod('All')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const handleRefresh = () => {
    void fetchHistory()
  }

  // ============================================================
  // CSV EXPORT
  // ============================================================

  const handleExport = () => {
    if (records.length === 0) {
      return
    }

    const headers = [
      'Date',
      'Time',
      'Name',
      'ID',
      'Type',
      'Department',
      'Method',
      'Status',
      'Check In',
      'Check Out',
    ]

    const rows = records.map((record) => [
      record.date,
      record.time,
      record.name,
      record.personId,
      record.personType,
      record.department,
      record.method,
      record.status,
      record.checkIn,
      record.checkOut,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = 'attendance-history.csv'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="relative min-h-full overflow-hidden bg-linear-to-br from-slate-100 via-indigo-100/70 to-sky-100/70 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FileText size={14} />
              Attendance Records
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Attendance History
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review historical attendance records stored in the database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/15 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-700 backdrop-blur-xl transition hover:border-indigo-300 hover:bg-white/65 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={loading || records.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Unable to load attendance history
              </p>

              <p className="mt-1 text-xs text-indigo-700/80">{error}</p>

              <p className="mt-2 text-xs text-slate-500">Backend: {API_BASE_URL}</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 rounded-lg border border-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Records"
            value={summary.total_records}
            subtitle="From backend"
            icon={<FileText size={19} />}
            iconClass="border-blue-400/20 bg-blue-500/10 text-blue-400"
          />

          <StatCard
            title="Present"
            value={summary.present}
            subtitle={`${summary.total_records > 0 ? ((summary.present / summary.total_records) * 100).toFixed(1) : '0.0'}% of records`}
            icon={<CheckCircle2 size={19} />}
            iconClass="border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
          />

          <StatCard
            title="Late"
            value={summary.late}
            subtitle={`${summary.total_records > 0 ? ((summary.late / summary.total_records) * 100).toFixed(1) : '0.0'}% of records`}
            icon={<Clock3 size={19} />}
            iconClass="border-amber-400/20 bg-amber-500/10 text-amber-400"
          />

          <StatCard
            title="Absent"
            value={summary.absent}
            subtitle={`${summary.attendance_rate.toFixed(1)}% attendance rate`}
            icon={<XCircle size={19} />}
            iconClass="border-indigo-500/20 bg-indigo-500/10 text-indigo-700"
          />
        </div>

        {/* FILTERS */}

        <section className="rounded-2xl border border-indigo-500/15 bg-white/50 p-4 shadow-xl shadow-indigo-900/10 backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-700">
                <Filter size={17} />
              </div>

              <div>
                <h2 className="text-sm font-semibold">Search & Filters</h2>

                <p className="text-xs text-slate-500">Filters are applied through the backend.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-slate-500 transition hover:text-indigo-700"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search name, ID or department..."
                className="h-11 w-full rounded-xl border border-indigo-500/15 bg-white/50 backdrop-blur-md pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <DateInput label="From" value={fromDate} onChange={handleFromDateChange} />

            <DateInput label="To" value={toDate} onChange={handleToDateChange} />

            <SelectInput
              label="Person"
              value={personType}
              onChange={handlePersonTypeChange}
              options={['All', 'Student', 'Faculty']}
            />

            <SelectInput
              label="Status"
              value={status}
              onChange={handleStatusChange}
              options={['All', 'Present', 'Late', 'Absent']}
            />

            <SelectInput
              label="Method"
              value={method}
              onChange={handleMethodChange}
              options={['All', 'Face', 'NFC', 'Manual']}
            />
          </div>
        </section>

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-indigo-500/15 bg-white/50 shadow-xl shadow-indigo-900/10 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-3 border-b border-indigo-500/15 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Attendance Records</h2>

              <p className="mt-1 text-xs text-slate-500">
                {totalRecords.toLocaleString()} record
                {totalRecords === 1 ? '' : 's'} found
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              PostgreSQL data
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-262.5 border-collapse">
              <thead>
                <tr className="border-b border-indigo-500/15 bg-white/50 backdrop-blur-xl text-left">
                  <TableHeader>Date</TableHeader>

                  <TableHeader>Time</TableHeader>

                  <TableHeader>Person</TableHeader>

                  <TableHeader>ID</TableHeader>

                  <TableHeader>Department</TableHeader>

                  <TableHeader>Method</TableHeader>

                  <TableHeader>Status</TableHeader>

                  <TableHeader>Action</TableHeader>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 size={28} className="animate-spin text-indigo-700" />

                        <p className="mt-4 text-sm font-medium text-slate-700">
                          Loading attendance history...
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Fetching records from the backend.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/15 bg-white/50 backdrop-blur-xl text-slate-500">
                          <Search size={20} />
                        </div>

                        <h3 className="text-sm font-semibold text-slate-950">No records found</h3>

                        <p className="mt-1 text-xs text-slate-500">
                          No matching attendance records were returned by the backend.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-indigo-500/10 transition hover:bg-indigo-50/60"
                    >
                      <td className="px-5 py-4 text-sm text-slate-700">{record.date}</td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock3 size={14} className="text-slate-500" />

                          {record.time}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-700">
                            <UserRound size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-950">{record.name}</p>

                            <p className="mt-0.5 text-xs text-slate-500">{record.personType}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {record.personId}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">{record.department}</td>

                      <td className="px-5 py-4">
                        <MethodBadge method={record.method} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={record.status} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/15 bg-white/50 backdrop-blur-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-700"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex items-center justify-between border-t border-indigo-500/15 px-5 py-4">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/15 bg-white/50 backdrop-blur-xl text-slate-500 transition hover:border-indigo-500/20 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-red-500/15 px-3 text-xs font-semibold text-indigo-700">
                {page}
              </div>

              <button
                type="button"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/15 bg-white/50 backdrop-blur-xl text-slate-500 transition hover:border-indigo-500/20 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* DETAILS DRAWER */}

      {selectedRecord && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedRecord(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/20 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-indigo-500/15 bg-white/65 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-indigo-500/15 px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  Record Details
                </p>

                <h2 className="mt-1 text-lg font-bold">Attendance Details</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/15 bg-white/50 backdrop-blur-xl text-slate-500 transition hover:border-indigo-500/20 hover:text-slate-950"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-6 flex items-center gap-4 rounded-2xl border border-indigo-500/15 bg-white/50 backdrop-blur-xl p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-700">
                  <UserRound size={24} />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{selectedRecord.name}</h3>

                  <p className="mt-1 font-mono text-xs text-slate-500">{selectedRecord.personId}</p>

                  <p className="mt-1 text-xs text-slate-500">{selectedRecord.department}</p>
                </div>
              </div>

              <div className="space-y-1">
                <DetailRow label="Person Type" value={selectedRecord.personType} />

                <DetailRow
                  label="Date"
                  value={selectedRecord.date}
                  icon={<CalendarDays size={15} />}
                />

                <DetailRow
                  label="Check In"
                  value={selectedRecord.checkIn}
                  icon={<Clock3 size={15} />}
                />

                <DetailRow
                  label="Check Out"
                  value={selectedRecord.checkOut}
                  icon={<Clock3 size={15} />}
                />

                <DetailRow label="Method" value={selectedRecord.method} />

                <DetailRow
                  label="Confidence"
                  value={
                    selectedRecord.confidence !== null
                      ? `${selectedRecord.confidence.toFixed(1)}%`
                      : 'Not available'
                  }
                />

                <div className="flex items-center justify-between border-b border-indigo-500/10 py-4">
                  <span className="text-xs text-slate-500">Status</span>

                  <StatusBadge status={selectedRecord.status} />
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-500/15 p-5">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="flex w-full items-center justify-center rounded-xl border border-indigo-500/15 bg-white/50 backdrop-blur-xl py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/6 hover:text-slate-950"
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

type StatCardProps = {
  title: string
  value: number
  subtitle: string
  icon: ReactNode
  iconClass: string
}

function StatCard({ title, value, subtitle, icon, iconClass }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-indigo-500/15 bg-white/50 p-5 backdrop-blur-xl shadow-xl shadow-indigo-500/5 transition hover:-translate-y-0.5 hover:border-white/15">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TABLE HEADER
// ============================================================

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
      {children}
    </th>
  )
}

// ============================================================
// DATE INPUT
// ============================================================

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      <div className="relative">
        <CalendarDays
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-indigo-500/15 bg-white/50 backdrop-blur-md pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
        />
      </div>
    </label>
  )
}

// ============================================================
// SELECT
// ============================================================

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-indigo-500/15 bg-white/50 backdrop-blur-md px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white text-slate-800">
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = {
    Present: {
      className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-400',
      icon: <CheckCircle2 size={13} />,
    },

    Late: {
      className: 'border-amber-400/20 bg-amber-500/10 text-amber-400',
      icon: <Clock3 size={13} />,
    },

    Absent: {
      className: 'border-red-500/20 bg-red-500/10 text-red-700',
      icon: <XCircle size={13} />,
    },
  }[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      {config.icon}
      {status}
    </span>
  )
}

// ============================================================
// METHOD BADGE
// ============================================================

function MethodBadge({ method }: { method: AttendanceMethod }) {
  const config = {
    Face: 'border-purple-500/20 bg-purple-500/10 text-purple-700',

    NFC: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700',

    Manual: 'border-slate-400/20 bg-slate-500/10 text-slate-700',
  }[method]

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config}`}
    >
      {method}
    </span>
  )
}

// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-indigo-500/10 py-4">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  )
}

export default AttendanceHistoryPage
