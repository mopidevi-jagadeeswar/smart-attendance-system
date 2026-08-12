import axios from 'axios'
import {
  Camera,
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
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'

// ============================================================
// TYPES
// ============================================================

interface Faculty {
  id: string
  faculty_id: string
  full_name: string
  email: string
  phone: string | null
  department: string
  designation: string
  photo_url: string | null
  is_active: boolean
}

interface FacultyListResponse {
  total: number
  faculty: Faculty[]
}

type ModalType = 'profile' | 'edit' | 'face' | 'nfc' | 'attendance' | null

interface EditForm {
  full_name: string
  email: string
  phone: string
  department: string
  designation: string
  photo_url: string
  is_active: boolean
}

// ============================================================
// API
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ============================================================
// AUTH
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
// API ERROR
// ============================================================

function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return 'Cannot connect to the backend. Make sure FastAPI is running on port 8000.'
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.'
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.'
    }

    if (error.response?.status === 404) {
      return 'The requested API endpoint was not found.'
    }

    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      return 'The server rejected the request. Please check the submitted data.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

// ============================================================
// PAGE
// ============================================================

function FacultyPage() {
  const navigate = useNavigate()

  // ==========================================================
  // FACULTY STATE
  // ==========================================================

  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================================
  // SEARCH / FILTER
  // ==========================================================

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // ==========================================================
  // MENU / MODAL
  // ==========================================================

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)

  const [modal, setModal] = useState<ModalType>(null)

  // ==========================================================
  // ACTION STATE
  // ==========================================================

  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  // ==========================================================
  // EDIT FORM
  // ==========================================================

  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    photo_url: '',
    is_active: true,
  })

  // ==========================================================
  // NFC
  // ==========================================================

  const [nfcUid, setNfcUid] = useState('')

  // ==========================================================
  // LOAD FACULTY
  // ==========================================================

  const loadFaculty = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = getAccessToken()

      if (!token) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      const response = await axios.get<FacultyListResponse>(`${API_BASE_URL}/admin/faculty`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 15000,
      })

      if (response.data && Array.isArray(response.data.faculty)) {
        setFaculty(response.data.faculty)
      } else {
        setFaculty([])
      }
    } catch (requestError) {
      console.error('Failed to load faculty:', requestError)

      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFaculty()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadFaculty])

  // ==========================================================
  // REGISTER FACULTY
  // ==========================================================

  const openRegisterPage = () => {
    setOpenMenu(null)
    navigate('/admin/faculty/register')
  }

  // ==========================================================
  // FILTER FACULTY
  // ==========================================================

  const filteredFaculty = useMemo(() => {
    const query = search.trim().toLowerCase()

    return faculty.filter((member) => {
      const matchesSearch =
        query.length === 0 ||
        member.faculty_id.toLowerCase().includes(query) ||
        member.full_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department.toLowerCase().includes(query) ||
        member.designation.toLowerCase().includes(query) ||
        (member.phone ?? '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && member.is_active) ||
        (statusFilter === 'inactive' && !member.is_active)

      return matchesSearch && matchesStatus
    })
  }, [faculty, search, statusFilter])

  // ==========================================================
  // COUNTS
  // ==========================================================

  const activeCount = useMemo(() => faculty.filter((member) => member.is_active).length, [faculty])

  const inactiveCount = faculty.length - activeCount

  // ==========================================================
  // OPEN FACULTY MODAL
  // ==========================================================

  const openFacultyModal = (member: Faculty, type: ModalType) => {
    setSelectedFaculty(member)
    setModal(type)

    setOpenMenu(null)
    setActionMessage('')
    setActionError('')

    if (type === 'edit') {
      setEditForm({
        full_name: member.full_name,
        email: member.email,
        phone: member.phone ?? '',
        department: member.department,
        designation: member.designation,
        photo_url: member.photo_url ?? '',
        is_active: member.is_active,
      })
    }

    if (type === 'nfc') {
      setNfcUid('')
    }
  }

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeModal = () => {
    if (saving) {
      return
    }

    setModal(null)
    setSelectedFaculty(null)
    setActionMessage('')
    setActionError('')
    setNfcUid('')
  }

  // ==========================================================
  // UPDATE FACULTY
  // ==========================================================

  const updateFaculty = async () => {
    if (!selectedFaculty) {
      setActionError('No faculty member selected.')
      return
    }

    const token = getAccessToken()

    if (!token) {
      setActionError('Authentication token not found.')
      return
    }

    if (editForm.full_name.trim().length < 2) {
      setActionError('Please enter a valid full name.')
      return
    }

    if (!editForm.email.trim()) {
      setActionError('Please enter an email address.')
      return
    }

    if (!editForm.department.trim()) {
      setActionError('Please enter a department.')
      return
    }

    if (!editForm.designation.trim()) {
      setActionError('Please enter a designation.')
      return
    }

    setSaving(true)
    setActionError('')
    setActionMessage('')

    try {
      const response = await axios.put<Faculty>(
        `${API_BASE_URL}/admin/faculty/${selectedFaculty.id}`,
        {
          full_name: editForm.full_name.trim(),
          email: editForm.email.trim().toLowerCase(),
          phone: editForm.phone.trim() || null,
          department: editForm.department.trim(),
          designation: editForm.designation.trim(),
          photo_url: editForm.photo_url.trim() || null,
          is_active: editForm.is_active,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )

      const updatedFaculty = response.data

      setFaculty((current) =>
        current.map((member) => (member.id === updatedFaculty.id ? updatedFaculty : member))
      )

      setSelectedFaculty(updatedFaculty)

      setActionMessage('Faculty profile updated successfully.')
    } catch (requestError) {
      console.error('Failed to update faculty:', requestError)

      setActionError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // TOGGLE STATUS
  // ==========================================================

  const toggleFacultyStatus = async (member: Faculty) => {
    const token = getAccessToken()

    if (!token) {
      setActionError('Authentication token not found.')
      return
    }

    setSaving(true)
    setActionError('')
    setActionMessage('')

    try {
      const response = await axios.patch<Faculty>(
        `${API_BASE_URL}/admin/faculty/${member.id}/status`,
        {
          is_active: !member.is_active,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )

      const updatedFaculty = response.data

      setFaculty((current) =>
        current.map((item) => (item.id === updatedFaculty.id ? updatedFaculty : item))
      )

      if (selectedFaculty?.id === updatedFaculty.id) {
        setSelectedFaculty(updatedFaculty)
      }

      setActionMessage(
        updatedFaculty.is_active ? 'Faculty account activated.' : 'Faculty account deactivated.'
      )
    } catch (requestError) {
      console.error('Failed to update faculty status:', requestError)

      setActionError(getApiError(requestError))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================================
  // NFC
  // ==========================================================

  const registerNfc = () => {
    if (!selectedFaculty) {
      return
    }

    if (!nfcUid.trim()) {
      setActionError('Enter the NFC card UID first.')
      return
    }

    setActionError('Faculty NFC registration is not connected to the backend yet.')
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-linear-to-br from-slate-100 via-indigo-50 to-sky-50 text-black">
      {/* Background */}

      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-[130px]" />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        {/* Header */}

        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-white/45 backdrop-blur-xl p-5 shadow-lg shadow-indigo-500/10">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                  <Users size={18} strokeWidth={1.8} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">
                  Administration
                </p>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Faculty</h1>

              <p className="mt-1 text-sm text-black">
                Manage faculty profiles and attendance access.
              </p>
            </div>

            {/* REGISTER PAGE BUTTON */}

            <button
              type="button"
              onClick={openRegisterPage}
              className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:from-indigo-500 hover:to-purple-500"
            >
              <Plus size={17} />
              Register Faculty
            </button>
          </div>
        </div>

        {/* Statistics */}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Faculty"
            value={faculty.length}
            icon={<Users size={18} />}
            variant="indigo"
          />

          <StatCard
            label="Active Faculty"
            value={activeCount}
            icon={<ShieldCheck size={18} />}
            variant="emerald"
          />

          <StatCard
            label="Inactive Faculty"
            value={inactiveCount}
            icon={<UserRound size={18} />}
            variant="amber"
          />
        </div>

        {/* Main Card */}

        <div className="overflow-hidden rounded-2xl border border-indigo-500/10 bg-white/50 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
          <div className="h-px bg-linear-to-r from-transparent via-indigo-500/60 to-transparent" />

          {/* Toolbar */}

          <div className="flex flex-col gap-3 border-b border-indigo-100/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search faculty..."
                className="w-full rounded-xl border border-slate-200 bg-white/75 py-2.5 pl-10 pr-3 text-sm text-black outline-none transition placeholder:text-black/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-white/8 dark:bg-white/3 dark:placeholder:text-black/60"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                }
                className="appearance-none rounded-xl border border-slate-200 bg-white/75 py-2.5 pl-3.5 pr-9 text-sm font-medium text-black outline-none focus:border-indigo-500 dark:border-white/8 dark:bg-white/3"
              >
                <option value="all">All Faculty</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black"
              />
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="mx-4 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => void loadFaculty()}
                className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading */}

          {loading ? (
            <div className="flex min-h-90 flex-col items-center justify-center">
              <Loader2 size={30} className="animate-spin text-indigo-500" />

              <p className="mt-3 text-sm font-semibold">Loading faculty...</p>

              <p className="mt-1 text-xs text-black">Fetching faculty records.</p>
            </div>
          ) : (
            <>
              {/* Table */}

              <div className="overflow-x-auto">
                <table className="w-full min-w-237.5">
                  <thead>
                    <tr className="border-b border-slate-200 bg-linear-to-r from-indigo-100/70 via-purple-100/50 to-cyan-100/60">
                      <th className={tableHeader}>Faculty</th>

                      <th className={tableHeader}>Faculty ID</th>

                      <th className={tableHeader}>Department</th>

                      <th className={tableHeader}>Designation</th>

                      <th className={tableHeader}>Contact</th>

                      <th className={tableHeader}>Status</th>

                      <th className={`${tableHeader} text-right`}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                              <Users size={21} />
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {faculty.length === 0
                                ? 'No faculty registered yet'
                                : 'No faculty found'}
                            </p>

                            <p className="mt-1 text-xs text-black">
                              {faculty.length === 0
                                ? 'Register your first faculty member.'
                                : 'Try changing your search or filter.'}
                            </p>

                            {faculty.length === 0 && (
                              <button
                                type="button"
                                onClick={openRegisterPage}
                                className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                <Plus size={14} />
                                Register Faculty
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFaculty.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-indigo-100/70 transition hover:bg-indigo-50/60"
                        >
                          {/* Faculty */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {getImageUrl(member.photo_url) ? (
                                <img
                                  src={getImageUrl(member.photo_url) ?? ''}
                                  alt={member.full_name}
                                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-100 to-purple-100 text-indigo-500 ring-1 ring-indigo-500/20">
                                  <UserRound size={18} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {member.full_name}
                                </p>

                                <p className="max-w-55 truncate text-xs text-black">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Faculty ID */}

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600">
                              {member.faculty_id}
                            </span>
                          </td>

                          {/* Department */}

                          <td className="px-5 py-4">
                            <p className="text-sm text-black">{member.department}</p>
                          </td>

                          {/* Designation */}

                          <td className="px-5 py-4">
                            <p className="text-sm text-black">{member.designation}</p>
                          </td>

                          {/* Contact */}

                          <td className="px-5 py-4">
                            <p className="text-xs text-black">{member.phone || '—'}</p>
                          </td>

                          {/* Status */}

                          <td className="px-5 py-4">
                            <StatusBadge active={member.is_active} />
                          </td>

                          {/* Actions */}

                          <td className="relative px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()

                                setOpenMenu(openMenu === member.id ? null : member.id)
                              }}
                              className="rounded-lg p-2 text-black transition hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:bg-white/6 dark:hover:text-white"
                              aria-label={`Actions for ${member.full_name}`}
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {openMenu === member.id && (
                              <div
                                onClick={(event) => event.stopPropagation()}
                                className="absolute right-5 top-12 z-100 w-52 overflow-hidden rounded-xl border border-indigo-100/80 bg-white/90 p-1 text-left shadow-2xl backdrop-blur-xl"
                              >
                                <ActionButton
                                  icon={<Eye size={15} />}
                                  label="View Profile"
                                  onClick={() => openFacultyModal(member, 'profile')}
                                />

                                <ActionButton
                                  icon={<Edit3 size={15} />}
                                  label="Edit Faculty"
                                  onClick={() => openFacultyModal(member, 'edit')}
                                />

                                <ActionButton
                                  icon={<Camera size={15} />}
                                  label="Manage Face"
                                  onClick={() => openFacultyModal(member, 'face')}
                                />

                                <ActionButton
                                  icon={<Fingerprint size={15} />}
                                  label="Register NFC"
                                  onClick={() => openFacultyModal(member, 'nfc')}
                                />

                                <ActionButton
                                  icon={<Clock3 size={15} />}
                                  label="Attendance"
                                  onClick={() => openFacultyModal(member, 'attendance')}
                                />

                                <div className="my-1 border-t border-slate-100 dark:border-white/6" />

                                <ActionButton
                                  icon={member.is_active ? <X size={15} /> : <Check size={15} />}
                                  label={member.is_active ? 'Deactivate' : 'Activate'}
                                  onClick={() => {
                                    setOpenMenu(null)

                                    void toggleFacultyStatus(member)
                                  }}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 dark:border-white/6">
                <p className="text-xs text-black">
                  Showing{' '}
                  <span className="font-semibold text-black">
                    {filteredFaculty.length}
                  </span>{' '}
                  of <span className="font-semibold text-black">{faculty.length}</span>{' '}
                  faculty
                </p>

                <button
                  type="button"
                  onClick={() => void loadFaculty()}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          MODAL
      ======================================================= */}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-indigo-100/80 bg-white/90 shadow-2xl backdrop-blur-xl">
            {/* Modal Header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                  Faculty Management
                </p>

                <h2 className="mt-1 text-lg font-black">
                  {modal === 'profile' && 'Faculty Profile'}

                  {modal === 'edit' && 'Edit Faculty'}

                  {modal === 'face' && 'Face Registration'}

                  {modal === 'nfc' && 'NFC Registration'}

                  {modal === 'attendance' && 'Attendance'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-black hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {/* Profile */}

              {modal === 'profile' && selectedFaculty && (
                <ProfileSection
                  faculty={selectedFaculty}
                  onEdit={() => openFacultyModal(selectedFaculty, 'edit')}
                  onFace={() => openFacultyModal(selectedFaculty, 'face')}
                  onNfc={() => openFacultyModal(selectedFaculty, 'nfc')}
                />
              )}

              {/* Edit */}

              {modal === 'edit' && selectedFaculty && (
                <EditSection
                  form={editForm}
                  setForm={setEditForm}
                  saving={saving}
                  message={actionMessage}
                  error={actionError}
                  onSave={() => void updateFaculty()}
                  onCancel={closeModal}
                />
              )}

              {/* Face */}

              {modal === 'face' && selectedFaculty && (
                <FaceSection
                  faculty={selectedFaculty}
                  message={actionMessage}
                  error={actionError}
                />
              )}

              {/* NFC */}

              {modal === 'nfc' && selectedFaculty && (
                <NfcSection
                  faculty={selectedFaculty}
                  uid={nfcUid}
                  setUid={setNfcUid}
                  message={actionMessage}
                  error={actionError}
                  onRegister={registerNfc}
                />
              )}

              {/* Attendance */}

              {modal === 'attendance' && selectedFaculty && (
                <AttendanceSection faculty={selectedFaculty} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  variant: 'indigo' | 'emerald' | 'amber'
}

function StatCard({ label, value, icon, variant }: StatCardProps) {
  const variants = {
    indigo: 'from-indigo-100/90 via-white/70 to-cyan-100/80 border-indigo-200/80 text-indigo-500',

    emerald:
      'from-emerald-100/90 via-white/70 to-teal-100/80 border-emerald-200/80 text-emerald-500 dark:text-emerald-400',

    amber:
      'from-amber-100/90 via-white/70 to-orange-100/80 border-amber-200/80 text-amber-500 dark:text-amber-400',
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-linear-to-br p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${variants[variant]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black">{label}</p>

          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-current/10">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PROFILE SECTION
// ============================================================

function ProfileSection({
  faculty,
  onEdit,
  onFace,
  onNfc,
}: {
  faculty: Faculty
  onEdit: () => void
  onFace: () => void
  onNfc: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-linear-to-br from-indigo-100/70 via-purple-100/50 to-cyan-100/60 p-6 sm:flex-row">
        {getImageUrl(faculty.photo_url) ? (
          <img
            src={getImageUrl(faculty.photo_url) ?? ''}
            alt={faculty.full_name}
            className="h-24 w-24 rounded-2xl object-cover ring-2 ring-indigo-500/20"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
            <UserRound size={38} />
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-xl font-black">{faculty.full_name}</h3>

          <p className="mt-1 text-sm text-black">{faculty.designation}</p>

          <p className="mt-1 text-xs text-indigo-500">{faculty.faculty_id}</p>

          <StatusBadge active={faculty.is_active} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Email" value={faculty.email} />

        <InfoCard label="Phone" value={faculty.phone || 'Not provided'} />

        <InfoCard label="Department" value={faculty.department} />

        <InfoCard label="Designation" value={faculty.designation} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction icon={<Edit3 size={17} />} label="Edit Profile" onClick={onEdit} />

        <QuickAction icon={<Camera size={17} />} label="Manage Face" onClick={onFace} />

        <QuickAction icon={<Fingerprint size={17} />} label="Register NFC" onClick={onNfc} />
      </div>
    </div>
  )
}

// ============================================================
// EDIT SECTION
// ============================================================

function EditSection({
  form,
  setForm,
  saving,
  message,
  error,
  onSave,
  onCancel,
}: {
  form: EditForm
  setForm: Dispatch<SetStateAction<EditForm>>
  saving: boolean
  message: string
  error: string
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Full Name"
          value={form.full_name}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              full_name: value,
            }))
          }
        />

        <FormField
          label="Email"
          type="email"
          value={form.email}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              email: value,
            }))
          }
        />

        <FormField
          label="Phone"
          value={form.phone}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              phone: value,
            }))
          }
        />

        <FormField
          label="Department"
          value={form.department}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              department: value,
            }))
          }
        />

        <FormField
          label="Designation"
          value={form.designation}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              designation: value,
            }))
          }
        />

        <FormField
          label="Photo URL"
          value={form.photo_url}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              photo_url: value,
            }))
          }
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-indigo-100/80 bg-white/40">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              is_active: event.target.checked,
            }))
          }
          className="h-4 w-4 accent-indigo-600"
        />

        <div>
          <p className="text-sm font-semibold">Active Account</p>

          <p className="text-xs text-black">Allow this faculty account to remain active.</p>
        </div>
      </label>

      {error && <MessageBox type="error" message={error} />}

      {message && <MessageBox type="success" message={message} />}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-indigo-200/80 bg-white/60 px-4 py-2.5 text-sm font-semibold text-black"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}

          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// FACE SECTION
// ============================================================

function FaceSection({
  faculty,
  message,
  error,
}: {
  faculty: Faculty
  message: string
  error: string
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
          <Camera size={30} />
        </div>

        <h3 className="mt-4 text-lg font-black">Face Registration</h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-black">
          Manage the face profile for <strong>{faculty.full_name}</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FaceStatus label="Face Profile" value="Ready" />

        <FaceStatus label="Faculty" value={faculty.faculty_id} />

        <FaceStatus label="Recognition" value={faculty.is_active ? 'Enabled' : 'Disabled'} />
      </div>

      {error && <MessageBox type="error" message={error} />}

      {message && <MessageBox type="success" message={message} />}
    </div>
  )
}

// ============================================================
// NFC SECTION
// ============================================================

function NfcSection({
  faculty,
  uid,
  setUid,
  message,
  error,
  onRegister,
}: {
  faculty: Faculty
  uid: string
  setUid: (value: string) => void
  message: string
  error: string
  onRegister: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
          <Fingerprint size={30} />
        </div>

        <h3 className="mt-4 text-lg font-black">Register NFC Card</h3>

        <p className="mt-2 text-sm text-black">
          Register an NFC card for <strong>{faculty.full_name}</strong>.
        </p>
      </div>

      <div>
        <label
          htmlFor="faculty-nfc-uid"
          className="mb-2 block text-xs font-bold uppercase tracking-wider text-black"
        >
          NFC Card UID
        </label>

        <input
          id="faculty-nfc-uid"
          value={uid}
          onChange={(event) => setUid(event.target.value)}
          placeholder="Scan or enter NFC UID"
          className="w-full rounded-xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-950 outline-none focus:border-cyan-500"
        />
      </div>

      {error && <MessageBox type="error" message={error} />}

      {message && <MessageBox type="success" message={message} />}

      <button
        type="button"
        onClick={onRegister}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-700"
      >
        <Fingerprint size={16} />
        Register NFC Card
      </button>
    </div>
  )
}

// ============================================================
// ATTENDANCE SECTION
// ============================================================

function AttendanceSection({ faculty }: { faculty: Faculty }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Clock3 size={30} />
        </div>

        <h3 className="mt-4 text-lg font-black">Faculty Attendance</h3>

        <p className="mt-2 text-sm text-black">
          Attendance information for <strong>{faculty.full_name}</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoCard label="Faculty ID" value={faculty.faculty_id} />

        <InfoCard label="Department" value={faculty.department} />

        <InfoCard label="Status" value={faculty.is_active ? 'Active' : 'Inactive'} />
      </div>

      <div className="rounded-xl border border-indigo-100/80 bg-white/40">
        <Clock3 size={24} className="mx-auto text-black" />

        <p className="mt-3 text-sm font-semibold">Attendance records</p>

        <p className="mt-1 text-xs text-black">
          Connect this section to the attendance history endpoint when required.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/75 px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:border-indigo-500"
      />
    </div>
  )
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/65 p-4 backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-wider text-black">{label}</p>

      <p className="mt-1 break-all text-sm font-semibold">{value}</p>
    </div>
  )
}

// ============================================================
// QUICK ACTION
// ============================================================

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-xs font-bold transition hover:-translate-y-0.5 hover:border-indigo-400 hover:text-indigo-600 dark:border-white/8 dark:bg-white/3 dark:hover:text-indigo-400"
    >
      {icon}
      {label}
    </button>
  )
}

// ============================================================
// ACTION BUTTON
// ============================================================

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:bg-white/6 dark:hover:text-white"
    >
      {icon}
      {label}
    </button>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-500/10 text-black'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-400'}`} />

      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// ============================================================
// FACE STATUS
// ============================================================

function FaceStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-indigo-100/80 bg-white/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-black">{label}</p>

      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}

// ============================================================
// MESSAGE BOX
// ============================================================

function MessageBox({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400'
      }`}
    >
      {message}
    </div>
  )
}

// ============================================================
// TABLE HEADER
// ============================================================

const tableHeader =
  'px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-black dark:text-black'

// ============================================================
// EXPORT
// ============================================================

export default FacultyPage


// final page updated at 11-08-2026
