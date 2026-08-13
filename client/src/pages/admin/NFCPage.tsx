import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type CardStatus = 'active' | 'blocked' | 'unassigned'

type NFCRecord = {
  id: string
  card_uid: string
  student_id: string | null
  student_name: string | null
  status: CardStatus
  created_at: string | null
  last_used_at: string | null
}

type NFCForm = {
  card_uid: string
  student_id: string
}

type ApiNFCRecord = {
  id?: string | number
  card_uid?: string
  uid?: string
  nfc_uid?: string
  student_id?: string | null
  student_name?: string | null
  full_name?: string | null
  status?: string
  is_active?: boolean
  created_at?: string | null
  registered_at?: string | null
  last_used_at?: string | null
}

const initialForm: NFCForm = {
  card_uid: '',
  student_id: '',
}

function getToken(): string | null {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

function normalizeStatus(record: ApiNFCRecord): CardStatus {
  if (record.status?.toLowerCase() === 'blocked' || record.status?.toLowerCase() === 'inactive') {
    return 'blocked'
  }

  if (record.student_id === null || record.student_id === undefined || record.student_id === '') {
    return 'unassigned'
  }

  if (record.is_active === false) {
    return 'blocked'
  }

  return 'active'
}

function normalizeRecord(record: ApiNFCRecord, index: number): NFCRecord {
  return {
    id: String(record.id ?? index),
    card_uid: record.card_uid || record.uid || record.nfc_uid || 'Unknown',
    student_id: record.student_id || null,
    student_name: record.student_name || record.full_name || null,
    status: normalizeStatus(record),
    created_at: record.created_at || record.registered_at || null,
    last_used_at: record.last_used_at || null,
  }
}

function formatDate(value: string | null): string {
  if (!value) {
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NFCPage() {
  const [cards, setCards] = useState<NFCRecord[]>([])

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | CardStatus>('all')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const [form, setForm] = useState<NFCForm>(initialForm)

  const [registering, setRegistering] = useState(false)

  const [actionId, setActionId] = useState<string | null>(null)

  const loadCards = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/nfc`, {
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
            : `Unable to load NFC cards (${response.status}).`

        throw new Error(detail)
      }

      const payload = responseData as
        | ApiNFCRecord[]
        | {
            data?: ApiNFCRecord[]
            items?: ApiNFCRecord[]
            records?: ApiNFCRecord[]
          }

      const rawRecords = Array.isArray(payload)
        ? payload
        : payload.data || payload.items || payload.records || []

      setCards(rawRecords.map(normalizeRecord))
    } catch (requestError) {
      console.error('Failed to load NFC cards:', requestError)

      setError(requestError instanceof Error ? requestError.message : 'Unable to load NFC cards.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCards()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadCards])

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase()

    return cards.filter((card) => {
      const matchesSearch =
        !query ||
        card.card_uid.toLowerCase().includes(query) ||
        (card.student_id || '').toLowerCase().includes(query) ||
        (card.student_name || '').toLowerCase().includes(query)

      const matchesFilter = filter === 'all' || card.status === filter

      return matchesSearch && matchesFilter
    })
  }, [cards, search, filter])

  const totalCards = cards.length

  const activeCards = cards.filter((card) => card.status === 'active').length

  const blockedCards = cards.filter((card) => card.status === 'blocked').length

  const unassignedCards = cards.filter((card) => card.status === 'unassigned').length

  const updateForm = (field: keyof NFCForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const closeModal = () => {
    if (registering) {
      return
    }

    setShowRegisterModal(false)
    setForm(initialForm)
  }

  const registerCard = async () => {
    setError('')
    setSuccess('')

    const cardUid = form.card_uid.trim()
    const studentId = form.student_id.trim()

    if (!cardUid) {
      setError('NFC Card UID is required.')
      return
    }

    setRegistering(true)

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/nfc/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          card_uid: cardUid,
          student_id: studentId || null,
        }),
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
            : `NFC registration failed (${response.status}).`

        throw new Error(detail)
      }

      setSuccess('NFC card registered successfully.')

      setShowRegisterModal(false)
      setForm(initialForm)

      await loadCards(true)
    } catch (requestError) {
      console.error('NFC registration error:', requestError)

      setError(requestError instanceof Error ? requestError.message : 'NFC registration failed.')
    } finally {
      setRegistering(false)
    }
  }

  const toggleCardStatus = async (card: NFCRecord) => {
    setError('')
    setSuccess('')
    setActionId(card.id)

    const newStatus = card.status === 'active' ? 'blocked' : 'active'

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/nfc/${card.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          status: newStatus,
        }),
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
            : `Unable to update NFC card (${response.status}).`

        throw new Error(detail)
      }

      setSuccess(newStatus === 'active' ? 'NFC card activated.' : 'NFC card blocked.')

      await loadCards(true)
    } catch (requestError) {
      console.error('NFC status update error:', requestError)

      setError(requestError instanceof Error ? requestError.message : 'Unable to update NFC card.')
    } finally {
      setActionId(null)
    }
  }

  const deleteCard = async (card: NFCRecord) => {
    const confirmed = window.confirm(`Remove NFC card "${card.card_uid}"?`)

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')
    setActionId(card.id)

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/nfc/${card.id}`, {
        method: 'DELETE',
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
            : `Unable to remove NFC card (${response.status}).`

        throw new Error(detail)
      }

      setSuccess('NFC card removed successfully.')

      await loadCards(true)
    } catch (requestError) {
      console.error('NFC delete error:', requestError)

      setError(requestError instanceof Error ? requestError.message : 'Unable to remove NFC card.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-slate-50 p-4 text-slate-950 sm:p-5 lg:p-6">
      {/* Background */}

      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600">
              <CreditCard size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">NFC Management</h1>

              <p className="mt-1 text-xs text-slate-600">Register, assign, and manage NFC cards.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadCards(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setError('')
                setSuccess('')
                setShowRegisterModal(true)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={17} />
              Register NFC
            </button>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X size={18} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-bold">Something went wrong</p>

              <p className="mt-1 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <ShieldCheck size={18} />

            {success}
          </div>
        )}

        {/* Statistics */}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Cards"
            value={totalCards}
            icon={<CreditCard size={19} />}
            gradient="from-indigo-50 via-white to-cyan-50"
            iconStyle="bg-indigo-100 text-indigo-600"
          />

          <StatCard
            label="Active Cards"
            value={activeCards}
            icon={<ShieldCheck size={19} />}
            gradient="from-emerald-50 via-white to-teal-50"
            iconStyle="bg-emerald-100 text-emerald-600"
          />

          <StatCard
            label="Unassigned"
            value={unassignedCards}
            icon={<UserRound size={19} />}
            gradient="from-amber-50 via-white to-orange-50"
            iconStyle="bg-amber-100 text-amber-600"
          />

          <StatCard
            label="Blocked"
            value={blockedCards}
            icon={<X size={19} />}
            gradient="from-rose-50 via-white to-pink-50"
            iconStyle="bg-rose-100 text-rose-600"
          />
        </div>

        {/* Main Card */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-indigo-500/5">
          {/* Search / Filters */}

          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search card UID, student ID, or student name..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-black shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
                {(
                  [
                    ['all', 'All'],
                    ['active', 'Active'],
                    ['unassigned', 'Unassigned'],
                    ['blocked', 'Blocked'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`
                      whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition
                      ${
                        filter === value
                          ? 'bg-indigo-600 text-white'
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
            <table className="w-full min-w-250 bg-white text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-black">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    NFC Card
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Assigned Student
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Status
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Registered
                  </th>

                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Last Used
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <LoadingRows />
                ) : filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <CreditCard size={25} />
                        </div>

                        <h3 className="mt-4 text-sm font-bold text-black">No NFC cards found</h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {search || filter !== 'all'
                            ? 'Try changing your search or filter.'
                            : 'Register your first NFC card to get started.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <NFCR
                      key={card.id}
                      card={card}
                      actionId={actionId}
                      onToggle={() => void toggleCardStatus(card)}
                      onDelete={() => void deleteCard(card)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}

          <div className="border-t border-slate-200 bg-white px-5 py-3.5">
            <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="text-black">{filteredCards.length}</strong> of{' '}
                <strong className="text-black">{cards.length}</strong> cards
              </span>

              <span className="font-medium text-slate-600">NFC card management</span>
            </div>
          </div>
        </section>
      </div>

      {/* Register Modal */}

      {showRegisterModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-black">Register NFC Card</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Add an NFC card and optionally assign it to a student.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={registering}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-black disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-xs font-bold text-black">NFC Card UID</label>

                <input
                  type="text"
                  value={form.card_uid}
                  onChange={(event) => updateForm('card_uid', event.target.value)}
                  placeholder="e.g. A4:23:91:8F:2C"
                  disabled={registering}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-black">
                  Student ID
                  <span className="ml-1 font-normal text-slate-400">(optional)</span>
                </label>

                <input
                  type="text"
                  value={form.student_id}
                  onChange={(event) => updateForm('student_id', event.target.value)}
                  placeholder="e.g. STU001"
                  disabled={registering}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />

                <p className="mt-2 text-[11px] text-slate-500">
                  Leave this empty if the card should remain unassigned.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-start gap-3">
                  <CreditCard size={18} className="mt-0.5 shrink-0 text-indigo-600" />

                  <div>
                    <p className="text-xs font-bold text-black">NFC card information</p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      The card UID uniquely identifies the physical NFC card. It can be assigned to
                      a student now or later.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={registering}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void registerCard()}
                disabled={registering || !form.card_uid.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registering ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Register Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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

        <CreditCard size={28} className="text-slate-200" />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{label}</p>

      <p className="mt-1 text-3xl font-black tracking-tight text-black">{value}</p>
    </div>
  )
}

/* ============================================================
   NFC TABLE ROW
============================================================ */

interface NFCRowProps {
  card: NFCRecord
  actionId: string | null
  onToggle: () => void
  onDelete: () => void
}

function NFCR({ card, actionId, onToggle, onDelete }: NFCRowProps) {
  const busy = actionId === card.id

  return (
    <tr className="transition-colors hover:bg-indigo-50/50">
      {/* Card */}

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CreditCard size={18} />
          </div>

          <div>
            <p className="font-mono text-sm font-bold text-black">{card.card_uid}</p>

            <p className="mt-0.5 text-[11px] text-slate-500">NFC UID</p>
          </div>
        </div>
      </td>

      {/* Student */}

      <td className="px-5 py-4">
        {card.student_id ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserRound size={16} />
            </div>

            <div>
              <p className="text-sm font-bold text-black">{card.student_name || 'Student'}</p>

              <p className="mt-0.5 text-xs text-slate-500">{card.student_id}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm font-medium text-slate-400">Not assigned</span>
        )}
      </td>

      {/* Status */}

      <td className="px-5 py-4">
        {card.status === 'active' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        )}

        {card.status === 'blocked' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Blocked
          </span>
        )}

        {card.status === 'unassigned' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Unassigned
          </span>
        )}
      </td>

      {/* Registered */}

      <td className="px-5 py-4 text-sm font-medium text-black">{formatDate(card.created_at)}</td>

      {/* Last Used */}

      <td className="px-5 py-4">
        <p className="text-xs font-medium text-black">{formatDateTime(card.last_used_at)}</p>
      </td>

      {/* Actions */}

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          {card.status !== 'unassigned' && (
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
              className={`
                rounded-lg border px-3 py-2
                text-[11px] font-bold transition
                disabled:cursor-not-allowed disabled:opacity-50
                ${
                  card.status === 'active'
                    ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                    : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                }
              `}
            >
              {busy ? 'Updating...' : card.status === 'active' ? 'Block' : 'Activate'}
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${card.card_uid}`}
            className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
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
          {Array.from({
            length: 6,
          }).map((_, cellIndex) => (
            <td key={cellIndex} className="px-5 py-5">
              <div
                className={`
                    h-4 animate-pulse rounded-lg bg-slate-100
                    ${cellIndex === 0 ? 'w-44' : cellIndex === 5 ? 'ml-auto w-28' : 'w-24'}
                  `}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
