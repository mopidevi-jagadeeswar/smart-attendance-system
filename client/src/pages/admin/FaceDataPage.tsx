import {
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  ScanFace,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type EnrollmentStatus = 'enrolled' | 'pending'

interface FaceRecord {
  id: string
  personId: string
  name: string
  email: string
  role: 'Student' | 'Faculty'
  photos: number
  embeddings: number
  status: EnrollmentStatus
  updatedAt: string
}

interface ApiFaceRecord {
  id?: string | number
  student_id?: string
  faculty_id?: string
  user_id?: string | number
  full_name?: string
  name?: string
  email?: string
  role?: string
  photo_count?: number
  photos?: number
  embedding_count?: number
  embeddings?: number
  is_enrolled?: boolean
  enrolled?: boolean
  updated_at?: string
  created_at?: string
}

interface FaceDataResponse {
  data?: ApiFaceRecord[]
  items?: ApiFaceRecord[]
  records?: ApiFaceRecord[]
}

type FilterType = 'all' | 'enrolled' | 'pending'

function getToken(): string | null {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

function normalizeRecord(record: ApiFaceRecord, index: number): FaceRecord {
  const role = record.role?.toLowerCase() === 'faculty' ? 'Faculty' : 'Student'

  const photos = Number(record.photo_count ?? record.photos ?? 0)

  const embeddings = Number(record.embedding_count ?? record.embeddings ?? 0)

  const enrolled = record.is_enrolled ?? record.enrolled ?? photos >= 5

  return {
    id: String(record.id ?? record.user_id ?? index),
    personId: String(record.student_id ?? record.faculty_id ?? record.user_id ?? '—'),
    name: record.full_name || record.name || 'Unknown User',
    email: record.email || '—',
    role,
    photos,
    embeddings,
    status: enrolled ? 'enrolled' : 'pending',
    updatedAt: record.updated_at || record.created_at || '—',
  }
}

function formatDate(value: string): string {
  if (!value || value === '—') {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function FaceDataPage() {
  const [records, setRecords] = useState<FaceRecord[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadFaceData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/face-data`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
      })

      let responseData: unknown = null

      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }

      if (!response.ok) {
        const detail =
          typeof responseData === 'object' && responseData !== null && 'detail' in responseData
            ? String(
                (
                  responseData as {
                    detail?: unknown
                  }
                ).detail
              )
            : `Unable to load face data (${response.status}).`

        throw new Error(detail)
      }

      const payload = responseData as ApiFaceRecord[] | FaceDataResponse

      const rawRecords = Array.isArray(payload)
        ? payload
        : payload.data || payload.items || payload.records || []

      setRecords(rawRecords.map(normalizeRecord))
    } catch (requestError) {
      console.error('Failed to load face data:', requestError)

      setError(requestError instanceof Error ? requestError.message : 'Unable to load face data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFaceData()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadFaceData])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.personId.toLowerCase().includes(query) ||
        record.name.toLowerCase().includes(query) ||
        record.email.toLowerCase().includes(query)

      const matchesFilter = filter === 'all' || record.status === filter

      return matchesSearch && matchesFilter
    })
  }, [records, search, filter])

  const totalUsers = records.length

  const enrolledUsers = records.filter((record) => record.status === 'enrolled').length

  const pendingUsers = records.filter((record) => record.status === 'pending').length

  const totalEmbeddings = records.reduce((total, record) => total + record.embeddings, 0)

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-slate-50 p-4 text-slate-950 sm:p-5 lg:p-6">
      {/* Background accents */}

      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600">
              <ScanFace size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Face Data</h1>

              <p className="mt-1 text-xs text-slate-600">
                Manage face enrollment and stored face embeddings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadFaceData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to load face data</p>

              <p className="mt-1 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics */}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={totalUsers}
            icon={<Users size={19} />}
            gradient="from-indigo-50 via-white to-cyan-50"
            iconStyle="bg-indigo-100 text-indigo-600"
          />

          <StatCard
            label="Face Enrolled"
            value={enrolledUsers}
            icon={<CheckCircle2 size={19} />}
            gradient="from-emerald-50 via-white to-teal-50"
            iconStyle="bg-emerald-100 text-emerald-600"
          />

          <StatCard
            label="Pending"
            value={pendingUsers}
            icon={<ScanFace size={19} />}
            gradient="from-amber-50 via-white to-orange-50"
            iconStyle="bg-amber-100 text-amber-600"
          />

          <StatCard
            label="Embeddings"
            value={totalEmbeddings}
            icon={<ShieldCheck size={19} />}
            gradient="from-purple-50 via-white to-pink-50"
            iconStyle="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Main card */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-indigo-500/5">
          {/* Filters */}

          <div className="border-b border-slate-200 bg-white/70 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* Search */}

              <div className="relative flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by ID, name, or email..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-black shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              {/* Filter */}

              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                {(
                  [
                    ['all', 'All'],
                    ['enrolled', 'Enrolled'],
                    ['pending', 'Pending'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`
                      rounded-lg px-4 py-2 text-xs font-bold transition
                      ${
                        filter === value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-225 bg-white text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-black">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Person
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Role
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Face Photos
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Embeddings
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Status
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Updated
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <LoadingRows />
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <ScanFace size={25} />
                        </div>

                        <h3 className="mt-4 text-sm font-bold text-slate-950">
                          No face data found
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {search || filter !== 'all'
                            ? 'Try changing your search or filter.'
                            : 'No face enrollment records are available yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => <FaceDataRow key={record.id} record={record} />)
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}

          <div className="border-t border-slate-200 bg-white px-5 py-3.5">
            <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="text-black">{filteredRecords.length}</strong> of{' '}
                <strong className="text-black">{records.length}</strong> records
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Face enrollment status
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ============================================================
   STAT CARD
============================================================ */

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  gradient: string
  iconStyle: string
}

function StatCard({ label, value, icon, gradient, iconStyle }: StatCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-slate-200
        bg-linear-to-br ${gradient}
        p-5 shadow-lg shadow-indigo-500/5
        backdrop-blur-xl
      `}
    >
      <div className="flex items-center justify-between">
        <div
          className={`
            flex h-10 w-10 items-center justify-center
            rounded-xl ${iconStyle}
          `}
        >
          {icon}
        </div>

        <ScanFace size={28} className="text-slate-200" />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{label}</p>

      <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  )
}

/* ============================================================
   TABLE ROW
============================================================ */

function FaceDataRow({ record }: { record: FaceRecord }) {
  const enrolled = record.status === 'enrolled'

  return (
    <tr className="transition-colors hover:bg-indigo-50/50">
      {/* Person */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{record.name}</p>

            <p className="mt-0.5 truncate text-xs text-slate-500">{record.personId}</p>
          </div>
        </div>
      </td>

      {/* Role */}

      <td className="px-5 py-4">
        <span
          className={`
            inline-flex rounded-full border px-3 py-1.5
            text-[10px] font-black
            ${
              record.role === 'Faculty'
                ? 'border-purple-200 bg-purple-50 text-purple-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }
          `}
        >
          {record.role}
        </span>
      </td>

      {/* Photos */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{
                width: `${Math.min(record.photos * 20, 100)}%`,
              }}
            />
          </div>

          <span className="text-xs font-bold text-slate-950">{record.photos}/5</span>
        </div>
      </td>

      {/* Embeddings */}

      <td className="px-5 py-4">
        <span className="text-sm font-bold text-slate-950">{record.embeddings}</span>
      </td>

      {/* Status */}

      <td className="px-5 py-4">
        {enrolled ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
            <CheckCircle2 size={13} />
            Enrolled
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
            <XCircle size={13} />
            Pending
          </span>
        )}
      </td>

      {/* Updated */}

      <td className="px-5 py-4 text-sm font-medium text-slate-700">
        {formatDate(record.updatedAt)}
      </td>

      {/* Action */}

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={() => {
            console.log('View face data:', record)
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <Eye size={15} />
          View
        </button>
      </td>
    </tr>
  )
}

/* ============================================================
   LOADING ROWS
============================================================ */

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 7 }).map((_, cellIndex) => (
            <td key={cellIndex} className="px-5 py-5">
              <div
                className={`
                    h-4 animate-pulse rounded-lg
                    bg-slate-100
                    ${cellIndex === 0 ? 'w-48' : cellIndex === 6 ? 'ml-auto w-16' : 'w-24'}
                  `}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
