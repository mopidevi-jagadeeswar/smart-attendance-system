import axios from 'axios'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Eye,
  Fingerprint,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL = 'http://localhost:8000'

// ============================================================
// TYPES
// ============================================================

type AttendanceStatus = 'present' | 'late' | 'absent'

type AttendanceMethod = 'face' | 'nfc' | 'manual'

type PersonType = 'student' | 'faculty'

interface AttendanceRecord {
  id: string
  person_type: string
  student_id: string | null
  faculty_id: string | null
  name: string
  department: string | null
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  method: string
  status: string
  confidence_score: number | null
  device_id: string | null
  created_at: string | null
}

interface AttendanceForm {
  person_type: PersonType
  person_id: string
  attendance_date: string
  check_in_time: string
  check_out_time: string
  method: AttendanceMethod
  status: AttendanceStatus
  confidence_score: string
  device_id: string
}

type ModalType = 'view' | 'edit' | 'create' | null

// ============================================================
// HELPERS
// ============================================================

function getToken(): string | null {
  return localStorage.getItem('access_token') ?? localStorage.getItem('token')
}

function getHeaders() {
  const token = getToken()

  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  }
}

function getToday(): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentTime(): string {
  const now = new Date()

  const hours = String(now.getHours()).padStart(2, '0')

  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function toIsoDateTime(date: string, time: string): string {
  return `${date}T${time}:00`
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot connect to the backend. Make sure FastAPI is running on port 8000.'
    }

    if (error.response?.status === 401) {
      return 'Authentication failed. Please log in again.'
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.'
    }

    if (error.response?.status === 404) {
      return 'The requested attendance API endpoint was not found.'
    }

    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

function normalizeStatus(status: string): AttendanceStatus {
  const value = status.toLowerCase()

  if (value === 'late') {
    return 'late'
  }

  if (value === 'absent') {
    return 'absent'
  }

  return 'present'
}

function normalizeMethod(method: string): AttendanceMethod {
  const value = method.toLowerCase()

  if (value === 'nfc') {
    return 'nfc'
  }

  if (value === 'manual') {
    return 'manual'
  }

  return 'face'
}

function formatTime(value: string): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(value: string): string {
  if (!value) {
    return '—'
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

// ============================================================
// PAGE
// ============================================================

function AdminAttendancePage() {
  // ==========================================================
  // DATA
  // ==========================================================

  const [records, setRecords] = useState<AttendanceRecord[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [actionError, setActionError] = useState('')

  const [actionMessage, setActionMessage] = useState('')

  // ==========================================================
  // FILTERS
  // ==========================================================

  const [search, setSearch] = useState('')

  const [dateFilter, setDateFilter] = useState(getToday)

  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all')

  const [methodFilter, setMethodFilter] = useState<'all' | AttendanceMethod>('all')

  const [personFilter, setPersonFilter] = useState<'all' | PersonType>('all')

  // ==========================================================
  // UI
  // ==========================================================

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

  const [modal, setModal] = useState<ModalType>(null)

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState<AttendanceForm>(() => createEmptyForm())

  // ==========================================================
  // LOAD ATTENDANCE
  // ==========================================================

  useEffect(() => {
    let active = true

    const controller = new AbortController()

    const load = async () => {
      if (!active) {
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await axios.get<AttendanceRecord[]>(
          `${API_BASE_URL}/api/v1/admin/attendance`,
          {
            headers: getHeaders(),
            signal: controller.signal,
            params: {
              limit: 500,
              offset: 0,
            },
          }
        )

        if (active) {
          setRecords(response.data)
        }
      } catch (requestError) {
        if (axios.isAxiosError(requestError) && requestError.code === 'ERR_CANCELED') {
          return
        }

        if (active) {
          setError(getErrorMessage(requestError))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  // ==========================================================
  // FILTERED RECORDS
  // ==========================================================

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch =
        query.length === 0 ||
        record.name.toLowerCase().includes(query) ||
        (record.student_id ?? '').toLowerCase().includes(query) ||
        (record.faculty_id ?? '').toLowerCase().includes(query) ||
        (record.department ?? '').toLowerCase().includes(query)

      const matchesDate = dateFilter.length === 0 || record.attendance_date === dateFilter

      const matchesStatus =
        statusFilter === 'all' || normalizeStatus(record.status) === statusFilter

      const matchesMethod =
        methodFilter === 'all' || normalizeMethod(record.method) === methodFilter

      const matchesPerson =
        personFilter === 'all' || record.person_type.toLowerCase() === personFilter

      return matchesSearch && matchesDate && matchesStatus && matchesMethod && matchesPerson
    })
  }, [records, search, dateFilter, statusFilter, methodFilter, personFilter])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const present = filteredRecords.filter(
      (record) => normalizeStatus(record.status) === 'present'
    ).length

    const late = filteredRecords.filter(
      (record) => normalizeStatus(record.status) === 'late'
    ).length

    const absent = filteredRecords.filter(
      (record) => normalizeStatus(record.status) === 'absent'
    ).length

    const total = filteredRecords.length

    const attendanceRate = total === 0 ? 0 : Math.round(((present + late) / total) * 100)

    return {
      total,
      present,
      late,
      absent,
      attendanceRate,
    }
  }, [filteredRecords])

  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get<AttendanceRecord[]>(
        `${API_BASE_URL}/api/v1/admin/attendance`,
        {
          headers: getHeaders(),
          params: {
            limit: 500,
            offset: 0,
          },
        }
      )

      setRecords(response.data)

      setActionMessage('Attendance records refreshed.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // OPEN VIEW
  // ==========================================================

  const openView = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setModal('view')
    setOpenMenu(null)
    clearMessages()
  }

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  const openEdit = (record: AttendanceRecord) => {
    setSelectedRecord(record)

    setForm({
      person_type: record.person_type.toLowerCase() === 'faculty' ? 'faculty' : 'student',

      person_id: record.student_id ?? record.faculty_id ?? '',

      attendance_date: record.attendance_date,

      check_in_time: getTimeInputValue(record.check_in_time),

      check_out_time: record.check_out_time ? getTimeInputValue(record.check_out_time) : '',

      method: normalizeMethod(record.method),

      status: normalizeStatus(record.status),

      confidence_score: record.confidence_score !== null ? String(record.confidence_score) : '',

      device_id: record.device_id ?? '',
    })

    setModal('edit')
    setOpenMenu(null)
    clearMessages()
  }

  // ==========================================================
  // OPEN CREATE
  // ==========================================================

  const openCreate = () => {
    setSelectedRecord(null)
    setForm(createEmptyForm())
    setModal('create')
    setOpenMenu(null)
    clearMessages()
  }

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeModal = () => {
    if (saving || deleting) {
      return
    }

    setModal(null)
    setSelectedRecord(null)
    clearMessages()
  }

  // ==========================================================
  // SAVE ATTENDANCE
  // ==========================================================

  const saveAttendance = async () => {
    if (!form.person_id.trim()) {
      setActionError('Enter the student ID or faculty ID.')
      return
    }

    if (!form.attendance_date) {
      setActionError('Select an attendance date.')
      return
    }

    if (!form.check_in_time) {
      setActionError('Select the check-in time.')
      return
    }

    setSaving(true)
    clearMessages()

    try {
      const confidence = form.confidence_score.trim()

      if (modal === 'create') {
        await axios.post(
          `${API_BASE_URL}/api/v1/admin/attendance`,
          {
            person_type: form.person_type,

            person_id: form.person_id.trim(),

            attendance_date: form.attendance_date,

            check_in_time: toIsoDateTime(form.attendance_date, form.check_in_time),

            check_out_time: form.check_out_time
              ? toIsoDateTime(form.attendance_date, form.check_out_time)
              : null,

            method: form.method,

            status: form.status,

            confidence_score: confidence ? Number(confidence) : null,

            device_id: form.device_id.trim() || null,
          },
          {
            headers: getHeaders(),
          }
        )

        setActionMessage('Attendance record created successfully.')
      } else if (modal === 'edit' && selectedRecord) {
        await axios.put(
          `${API_BASE_URL}/api/v1/admin/attendance/${selectedRecord.id}`,
          {
            attendance_date: form.attendance_date,

            check_in_time: toIsoDateTime(form.attendance_date, form.check_in_time),

            check_out_time: form.check_out_time
              ? toIsoDateTime(form.attendance_date, form.check_out_time)
              : null,

            method: form.method,

            status: form.status,

            confidence_score: confidence ? Number(confidence) : null,

            device_id: form.device_id.trim() || null,
          },
          {
            headers: getHeaders(),
          }
        )

        setActionMessage('Attendance record updated successfully.')
      }

      await refresh()

      setModal(null)
      setSelectedRecord(null)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // QUICK STATUS
  // ==========================================================

  const changeStatus = async (record: AttendanceRecord, nextStatus: AttendanceStatus) => {
    setSaving(true)
    clearMessages()
    setOpenMenu(null)

    try {
      const response = await axios.patch<AttendanceRecord>(
        `${API_BASE_URL}/api/v1/admin/attendance/${record.id}/status`,
        null,
        {
          headers: getHeaders(),
          params: {
            status: nextStatus,
          },
        }
      )

      setRecords((current) => current.map((item) => (item.id === record.id ? response.data : item)))

      setActionMessage(`Attendance marked ${nextStatus}.`)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  const deleteAttendance = async (record: AttendanceRecord) => {
    const confirmed = window.confirm(`Delete attendance record for ${record.name}?`)

    if (!confirmed) {
      return
    }

    setDeleting(true)
    clearMessages()
    setOpenMenu(null)

    try {
      await axios.delete(`${API_BASE_URL}/api/v1/admin/attendance/${record.id}`, {
        headers: getHeaders(),
      })

      setRecords((current) => current.filter((item) => item.id !== record.id))

      setActionMessage('Attendance record deleted successfully.')
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setDeleting(false)
    }
  }

  // ==========================================================
  // CLEAR MESSAGES
  // ==========================================================

  const clearMessages = () => {
    setActionError('')
    setActionMessage('')
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-slate-50 text-black dark:bg-linear-to-br from-slate-100 via-indigo-50 to-sky-50 dark:text-black">
      {/* Background */}

      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 p-5 shadow-lg shadow-indigo-500/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-black shadow-lg">
                  <Clock3 size={18} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-400">
                  Administration
                </p>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Attendance Monitor
              </h1>

              <p className="mt-1 text-sm text-slate-700 dark:text-slate-700">
                Monitor, verify and manually manage student and faculty attendance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-black shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60 dark:border-white/8 dark:text-slate-300"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5"
              >
                <Plus size={17} />
                Manual Attendance
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================
            STATISTICS
        ===================================================== */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total"
            value={statistics.total}
            icon={<Users size={18} />}
            variant="indigo"
          />

          <StatCard
            label="Present"
            value={statistics.present}
            icon={<Check size={18} />}
            variant="emerald"
          />

          <StatCard
            label="Late"
            value={statistics.late}
            icon={<Clock3 size={18} />}
            variant="amber"
          />

          <StatCard label="Absent" value={statistics.absent} icon={<X size={18} />} variant="red" />

          <StatCard
            label="Rate"
            value={`${statistics.attendanceRate}%`}
            icon={<CalendarDays size={18} />}
            variant="cyan"
          />
        </div>

        {/* ====================================================
            MAIN CARD
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/55 shadow-xl shadow-indigo-200/30 backdrop-blur-2xl">
          <div className="h-px bg-linear-to-r from-transparent via-indigo-500/60 to-transparent" />

          {/* Filters */}

          <div className="border-b border-slate-200 p-4 dark:border-white/6">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
              {/* Search */}

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student, faculty or ID..."
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-white/8 dark:text-black"
                />
              </div>

              {/* Date */}

              <FilterSelect
                value={dateFilter}
                onChange={setDateFilter}
                icon={<CalendarDays size={15} />}
                options={[
                  {
                    value: getToday(),
                    label: 'Today',
                  },
                  {
                    value: '',
                    label: 'All Dates',
                  },
                ]}
              />

              {/* Status */}

              <FilterSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | AttendanceStatus)}
                icon={<Check size={15} />}
                options={[
                  {
                    value: 'all',
                    label: 'All Status',
                  },
                  {
                    value: 'present',
                    label: 'Present',
                  },
                  {
                    value: 'late',
                    label: 'Late',
                  },
                  {
                    value: 'absent',
                    label: 'Absent',
                  },
                ]}
              />

              {/* Method */}

              <FilterSelect
                value={methodFilter}
                onChange={(value) => setMethodFilter(value as 'all' | AttendanceMethod)}
                icon={<Fingerprint size={15} />}
                options={[
                  {
                    value: 'all',
                    label: 'All Methods',
                  },
                  {
                    value: 'face',
                    label: 'Face',
                  },
                  {
                    value: 'nfc',
                    label: 'NFC',
                  },
                  {
                    value: 'manual',
                    label: 'Manual',
                  },
                ]}
              />

              {/* Person */}

              <FilterSelect
                value={personFilter}
                onChange={(value) => setPersonFilter(value as 'all' | PersonType)}
                icon={<UserRound size={15} />}
                options={[
                  {
                    value: 'all',
                    label: 'Everyone',
                  },
                  {
                    value: 'student',
                    label: 'Students',
                  },
                  {
                    value: 'faculty',
                    label: 'Faculty',
                  },
                ]}
              />
            </div>
          </div>

          {/* Messages */}

          {error && <Message type="error" message={error} onClose={() => setError('')} />}

          {actionError && (
            <Message type="error" message={actionError} onClose={() => setActionError('')} />
          )}

          {actionMessage && (
            <Message type="success" message={actionMessage} onClose={() => setActionMessage('')} />
          )}

          {/* Loading */}

          {loading ? (
            <div className="flex min-h-100 flex-col items-center justify-center">
              <Loader2 size={32} className="animate-spin text-indigo-500" />

              <p className="mt-3 text-sm font-bold">Loading attendance...</p>

              <p className="mt-1 text-xs text-slate-700">Fetching attendance records.</p>
            </div>
          ) : (
            <>
              {/* Table */}

              <div className="overflow-x-auto">
                <table className="w-full min-w-245 border-separate border-spacing-0 bg-transparent text-black">
                  <thead className="bg-linear-to-r from-indigo-50/80 via-purple-50/70 to-cyan-50/80 backdrop-blur-xl">
                    <tr className="border-b border-indigo-100/80 bg-linear-to-r from-indigo-100/40 via-purple-100/30 to-cyan-100/40">
                      <th className={headerClass}>Person</th>

                      <th className={headerClass}>ID</th>

                      <th className={headerClass}>Date</th>

                      <th className={headerClass}>Time</th>

                      <th className={headerClass}>Method</th>

                      <th className={headerClass}>Status</th>

                      <th className={`${headerClass} text-right`}>Action</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white/25 backdrop-blur-sm">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                              <Clock3 size={22} />
                            </div>

                            <p className="mt-3 text-sm font-bold">No attendance records found</p>

                            <p className="mt-1 text-xs text-slate-700">
                              Change your filters or manually add attendance.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <AttendanceRow
                          key={record.id}
                          record={record}
                          openMenu={openMenu}
                          setOpenMenu={setOpenMenu}
                          onView={openView}
                          onEdit={openEdit}
                          onStatus={changeStatus}
                          onDelete={deleteAttendance}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}

              <div className="flex items-center justify-between border-t border-indigo-100/80 bg-linear-to-r from-indigo-50/55 via-white/35 to-cyan-50/55 px-5 py-3.5 backdrop-blur-xl">
                <p className="text-xs text-slate-600">
                  Showing{' '}
                  <span className="font-bold text-black dark:text-black">
                    {filteredRecords.length}
                  </span>{' '}
                  of <span className="font-bold text-black dark:text-black">{records.length}</span>{' '}
                  records
                </p>

                <p className="text-xs font-medium text-black">Admin attendance monitor</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          MODAL
      ======================================================= */}

      {modal && (
        <AttendanceModal
          modal={modal}
          record={selectedRecord}
          form={form}
          setForm={setForm}
          saving={saving}
          onClose={closeModal}
          onSave={() => void saveAttendance()}
          onEdit={selectedRecord ? () => openEdit(selectedRecord) : undefined}
        />
      )}
    </div>
  )
}

// ============================================================
// EMPTY FORM
// ============================================================

function createEmptyForm(): AttendanceForm {
  return {
    person_type: 'student',
    person_id: '',
    attendance_date: getToday(),
    check_in_time: getCurrentTime(),
    check_out_time: '',
    method: 'manual',
    status: 'present',
    confidence_score: '',
    device_id: '',
  }
}

// ============================================================
// TIME INPUT VALUE
// ============================================================

function getTimeInputValue(value: string): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  variant: 'indigo' | 'emerald' | 'amber' | 'red' | 'cyan'
}) {
  const variants = {
    indigo: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-500',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-500',
    red: 'border-red-500/20 bg-red-500/5 text-red-500',
    cyan: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-500',
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${variants[variant]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-black dark:text-black">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-current/10">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ATTENDANCE ROW
// ============================================================

function AttendanceRow({
  record,
  openMenu,
  setOpenMenu,
  onView,
  onEdit,
  onStatus,
  onDelete,
}: {
  record: AttendanceRecord
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onView: (record: AttendanceRecord) => void
  onEdit: (record: AttendanceRecord) => void
  onStatus: (record: AttendanceRecord, status: AttendanceStatus) => void
  onDelete: (record: AttendanceRecord) => Promise<void>
}) {
  const status = normalizeStatus(record.status)

  const method = normalizeMethod(record.method)

  const personType = record.person_type.toLowerCase()

  const personId = record.student_id ?? record.faculty_id ?? '—'

  return (
    <tr className="border-b border-slate-200/70 bg-white/35 transition-colors hover:bg-indigo-50/45">
      {/* Person */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              personType === 'faculty'
                ? 'bg-purple-500/10 text-purple-500'
                : 'bg-indigo-500/10 text-indigo-500'
            }`}
          >
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-black dark:text-black">{record.name}</p>

            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-700">
              {personType}
            </p>
          </div>
        </div>
      </td>

      {/* ID */}

      <td className="px-5 py-4">
        <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {personId}
        </span>
      </td>

      {/* Date */}

      <td className="px-5 py-4">
        <span className="text-xs font-medium text-black">{formatDate(record.attendance_date)}</span>
      </td>

      {/* Time */}

      <td className="px-5 py-4">
        <span className="text-xs font-semibold text-black">{formatTime(record.check_in_time)}</span>
      </td>

      {/* Method */}

      <td className="px-5 py-4">
        <MethodBadge method={method} />
      </td>

      {/* Status */}

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      {/* Actions */}

      <td className="relative px-5 py-4 text-right">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === record.id ? null : record.id)}
          className="rounded-lg p-2 text-slate-700 transition hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:bg-white/6 dark:hover:text-black"
          aria-label="Attendance actions"
        >
          <MoreHorizontal size={18} />
        </button>

        {openMenu === record.id && (
          <div className="absolute right-5 top-12 z-50 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-2xl dark:border-white/8 dark:bg-neutral-900">
            <MenuButton
              icon={<Eye size={15} />}
              label="View Details"
              onClick={() => onView(record)}
            />

            <MenuButton
              icon={<Edit3 size={15} />}
              label="Edit Attendance"
              onClick={() => onEdit(record)}
            />

            <div className="my-1 border-t border-slate-100 dark:border-white/6" />

            <MenuButton
              icon={<Check size={15} />}
              label="Mark Present"
              onClick={() => onStatus(record, 'present')}
            />

            <MenuButton
              icon={<Clock3 size={15} />}
              label="Mark Late"
              onClick={() => onStatus(record, 'late')}
            />

            <MenuButton
              icon={<X size={15} />}
              label="Mark Absent"
              onClick={() => onStatus(record, 'absent')}
            />

            <div className="my-1 border-t border-slate-100 dark:border-white/6" />

            <MenuButton
              danger
              icon={<Trash2 size={15} />}
              label="Delete Record"
              onClick={() => void onDelete(record)}
            />
          </div>
        )}
      </td>
    </tr>
  )
}

// ============================================================
// METHOD BADGE
// ============================================================

function MethodBadge({ method }: { method: AttendanceMethod }) {
  const config = {
    face: {
      label: 'Face',
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },

    nfc: {
      label: 'NFC',
      className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },

    manual: {
      label: 'Manual',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  }

  const item = config[method]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.className}`}
    >
      {method === 'face' && <UserRound size={11} />}

      {method === 'nfc' && <Fingerprint size={11} />}

      {method === 'manual' && <Edit3 size={11} />}

      {item.label}
    </span>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = {
    present: {
      label: 'Present',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-400',
    },

    late: {
      label: 'Late',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-400',
    },

    absent: {
      label: 'Absent',
      className: 'bg-red-500/10 text-red-600 dark:text-red-400',
      dot: 'bg-red-400',
    },
  }

  const item = config[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />

      {item.label}
    </span>
  )
}

// ============================================================
// FILTER SELECT
// ============================================================

function FilterSelect({
  value,
  onChange,
  icon,
  options,
}: {
  value: string
  onChange: (value: string) => void
  icon: React.ReactNode
  options: {
    value: string
    label: string
  }[]
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-700">
        {icon}
      </div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg py-2.5 pl-9 pr-9 text-sm font-medium outline-none focus:border-indigo-500 dark:border-white/8 dark:text-black"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700"
      />
    </div>
  )
}

// ============================================================
// MENU BUTTON
// ============================================================

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-slate-800 hover:bg-indigo-500/10 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-white/6 dark:hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ============================================================
// MESSAGE
// ============================================================

function Message({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}) {
  return (
    <div
      className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400'
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />

        <span>{message}</span>
      </div>

      <button type="button" onClick={onClose} className="rounded p-1 opacity-70 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  )
}

// ============================================================
// MODAL
// ============================================================

function AttendanceModal({
  modal,
  record,
  form,
  setForm,
  saving,
  onClose,
  onSave,
  onEdit,
}: {
  modal: ModalType
  record: AttendanceRecord | null
  form: AttendanceForm
  setForm: React.Dispatch<React.SetStateAction<AttendanceForm>>
  saving: boolean
  onClose: () => void
  onSave: () => void
  onEdit?: () => void
}) {
  if (!modal) {
    return null
  }

  const isView = modal === 'view'

  const title =
    modal === 'create'
      ? 'Manual Attendance'
      : modal === 'edit'
        ? 'Edit Attendance'
        : 'Attendance Details'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-neutral-900">
        {/* Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/6 dark:bg-neutral-900/95">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Attendance Monitor
            </p>

            <h2 className="mt-1 text-lg font-black">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {isView && record ? (
            <ViewAttendance record={record} onEdit={onEdit} />
          ) : (
            <AttendanceForm
              form={form}
              setForm={setForm}
              saving={saving}
              isCreate={modal === 'create'}
              onSave={onSave}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// VIEW ATTENDANCE
// ============================================================

function ViewAttendance({ record, onEdit }: { record: AttendanceRecord; onEdit?: () => void }) {
  const status = normalizeStatus(record.status)

  const method = normalizeMethod(record.method)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
            <UserRound size={25} />
          </div>

          <div>
            <h3 className="text-xl font-black">{record.name}</h3>

            <p className="mt-1 text-xs uppercase tracking-wider text-slate-700">
              {record.person_type}
            </p>

            <p className="mt-1 text-xs font-bold text-indigo-500">
              {record.student_id ?? record.faculty_id ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailCard label="Date" value={formatDate(record.attendance_date)} />

        <DetailCard label="Check-in" value={formatTime(record.check_in_time)} />

        <DetailCard
          label="Check-out"
          value={record.check_out_time ? formatTime(record.check_out_time) : 'Not recorded'}
        />

        <DetailCard label="Department" value={record.department ?? 'Not available'} />

        <div className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg p-4 dark:border-white/8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Method</p>

          <div className="mt-2">
            <MethodBadge method={method} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg p-4 dark:border-white/8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Status</p>

          <div className="mt-2">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {record.confidence_score !== null && (
        <DetailCard
          label="Face Confidence"
          value={`${Math.round(record.confidence_score * 100)}%`}
        />
      )}

      {record.device_id && <DetailCard label="Device" value={record.device_id} />}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-black hover:bg-indigo-700"
        >
          <Edit3 size={16} />
          Edit Attendance
        </button>
      )}
    </div>
  )
}

// ============================================================
// DETAIL CARD
// ============================================================

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg p-4 dark:border-white/8">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{label}</p>

      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}

// ============================================================
// ATTENDANCE FORM
// ============================================================

function AttendanceForm({
  form,
  setForm,
  saving,
  isCreate,
  onSave,
  onCancel,
}: {
  form: AttendanceForm
  setForm: React.Dispatch<React.SetStateAction<AttendanceForm>>
  saving: boolean
  isCreate: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-5">
      {/* Person */}

      {isCreate && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Person Type"
            value={form.person_type}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                person_type: value as PersonType,
              }))
            }
            options={[
              {
                value: 'student',
                label: 'Student',
              },
              {
                value: 'faculty',
                label: 'Faculty',
              },
            ]}
          />

          <FormInput
            label={form.person_type === 'student' ? 'Student ID' : 'Faculty ID'}
            value={form.person_id}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                person_id: value,
              }))
            }
            placeholder={form.person_type === 'student' ? 'e.g. ST001' : 'e.g. FAC001'}
          />
        </div>
      )}

      {!isCreate && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Person</p>

          <p className="mt-1 text-sm font-black">{form.person_id}</p>
        </div>
      )}

      {/* Date / Time */}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Attendance Date"
          type="date"
          value={form.attendance_date}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              attendance_date: value,
            }))
          }
        />

        <FormInput
          label="Check-in Time"
          type="time"
          value={form.check_in_time}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              check_in_time: value,
            }))
          }
        />

        <FormInput
          label="Check-out Time"
          type="time"
          value={form.check_out_time}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              check_out_time: value,
            }))
          }
        />

        <FormSelect
          label="Status"
          value={form.status}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              status: value as AttendanceStatus,
            }))
          }
          options={[
            {
              value: 'present',
              label: 'Present',
            },
            {
              value: 'late',
              label: 'Late',
            },
            {
              value: 'absent',
              label: 'Absent',
            },
          ]}
        />

        <FormSelect
          label="Method"
          value={form.method}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              method: value as AttendanceMethod,
            }))
          }
          options={[
            {
              value: 'manual',
              label: 'Manual',
            },
            {
              value: 'face',
              label: 'Face',
            },
            {
              value: 'nfc',
              label: 'NFC',
            },
          ]}
        />

        <FormInput
          label="Device ID"
          value={form.device_id}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              device_id: value,
            }))
          }
          placeholder="Optional"
        />

        <FormInput
          label="Confidence Score"
          type="number"
          value={form.confidence_score}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              confidence_score: value,
            }))
          }
          placeholder="0 to 1"
        />
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-600 dark:text-amber-400">
        Admin changes are saved directly to the attendance record in PostgreSQL.
      </div>

      {/* Buttons */}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-white/8"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-black hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}

          {saving ? 'Saving...' : isCreate ? 'Create Attendance' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// FORM INPUT
// ============================================================

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-white/8 dark:text-black"
      />
    </div>
  )
}

// ============================================================
// FORM SELECT
// ============================================================

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    value: string
    label: string
  }[]
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-lg px-3.5 py-2.5 pr-9 text-sm outline-none focus:border-indigo-500 dark:border-white/8 dark:text-black"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700"
        />
      </div>
    </div>
  )
}

// ============================================================
// HEADER CLASS
// ============================================================

const headerClass =
  'px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-700'

// ============================================================
// EXPORT
// ============================================================

export default AdminAttendancePage
