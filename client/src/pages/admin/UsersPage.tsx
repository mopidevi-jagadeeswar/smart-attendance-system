import axios from 'axios'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Loader2,
  MoreVertical,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

// ============================================================
// TYPES
// ============================================================

type UserRole = 'admin' | 'faculty' | 'student'

interface User {
  id: string
  login_id: string
  email: string
  role: UserRole
  full_name: string | null
  photo_url: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string | null
}

type FilterRole = 'all' | UserRole

type FilterStatus = 'all' | 'active' | 'inactive'

// ============================================================
// API
// ============================================================

const API_BASE_URL = 'http://localhost:8000'
const USERS_URL = `${API_BASE_URL}/admin/users`

// ============================================================
// TOKEN
// ============================================================

const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

// ============================================================
// ERROR HANDLER
// ============================================================

const getErrorMessage = (requestError: unknown): string => {
  if (!axios.isAxiosError(requestError)) {
    if (requestError instanceof Error) {
      return requestError.message
    }

    return 'Something went wrong.'
  }

  if (requestError.code === 'ERR_NETWORK') {
    return 'Unable to connect to the FastAPI server. Make sure the backend is running on port 8000.'
  }

  const responseStatus = requestError.response?.status
  const detail = requestError.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (responseStatus === 401) {
    return 'Your admin session has expired. Please log in again.'
  }

  if (responseStatus === 403) {
    return 'You do not have permission to manage users.'
  }

  if (responseStatus === 404) {
    return 'The requested user was not found.'
  }

  if (responseStatus === 422) {
    return 'The submitted information is invalid.'
  }

  if (responseStatus === 500) {
    return 'The server encountered an unexpected error.'
  }

  return 'Unable to complete the request. Please try again.'
}

// ============================================================
// COMPONENT
// ============================================================

function UsersPage() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // ==========================================================
  // DELETE
  // ==========================================================

  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ==========================================================
  // FETCH USERS
  // ==========================================================

  const loadUsers = useCallback(async (): Promise<User[]> => {
    const token = getAccessToken()

    if (!token) {
      throw new Error('Admin authentication token was not found. Please log in again.')
    }

    const response = await axios.get<User[]>(USERS_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    })

    return response.data
  }, [])

  const fetchUsers = useCallback(async (showLoading = true) => {
    const token = getAccessToken()

    if (!token) {
      setError('Admin authentication token was not found. Please log in again.')
      setLoading(false)
      return
    }

    if (showLoading) {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axios.get<User[]>(USERS_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      })

      setUsers(response.data)
    } catch (requestError) {
      console.error('Failed to load users:', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    let cancelled = false

    void loadUsers()
      .then((data) => {
        if (cancelled) {
          return
        }

        setUsers(data)
        setError('')
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return
        }

        console.error('Failed to load users:', requestError)
        setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadUsers])

  // ==========================================================
  // FILTER USERS
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.login_id.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.full_name?.toLowerCase().includes(normalizedSearch) ?? false)

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalUsers = users.length

  const activeUsers = users.filter((user) => user.is_active).length

  const studentUsers = users.filter((user) => user.role === 'student').length

  const facultyUsers = users.filter((user) => user.role === 'faculty').length

  // ==========================================================
  // TOGGLE USER STATUS
  // ==========================================================

  const toggleUserStatus = async (user: User) => {
    const token = getAccessToken()

    if (!token) {
      setError('Admin authentication token was not found.')
      return
    }

    try {
      setActionLoadingId(user.id)
      setError('')
      setSuccessMessage('')
      setOpenMenuId(null)

      const response = await axios.patch(
        `${USERS_URL}/${user.id}/status`,
        {
          is_active: !user.is_active,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      )

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                is_active: !user.is_active,
              }
            : item
        )
      )

      setSuccessMessage(
        response.data?.message ||
          (user.is_active ? 'User deactivated successfully.' : 'User activated successfully.')
      )
    } catch (requestError) {
      console.error('Failed to update user status:', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setActionLoadingId(null)
    }
  }

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  const handleResetPassword = async () => {
    if (!resetPasswordUser) {
      return
    }

    if (newPassword.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    const token = getAccessToken()

    if (!token) {
      setError('Admin authentication token was not found.')
      return
    }

    try {
      setResetLoading(true)
      setError('')
      setSuccessMessage('')

      const response = await axios.post(
        `${USERS_URL}/${resetPasswordUser.id}/reset-password`,
        {
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      )

      setSuccessMessage(response.data?.message || 'User password reset successfully.')

      setResetPasswordUser(null)
      setNewPassword('')
    } catch (requestError) {
      console.error('Failed to reset password:', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setResetLoading(false)
    }
  }

  // ==========================================================
  // DELETE USER
  // ==========================================================

  const handleDeleteUser = async () => {
    if (!deleteUser) {
      return
    }

    const token = getAccessToken()

    if (!token) {
      setError('Admin authentication token was not found.')
      return
    }

    try {
      setDeleteLoading(true)
      setError('')
      setSuccessMessage('')

      const response = await axios.delete(`${USERS_URL}/${deleteUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      })

      setUsers((previousUsers) => previousUsers.filter((user) => user.id !== deleteUser.id))

      setSuccessMessage(response.data?.message || 'User deleted successfully.')

      setDeleteUser(null)
    } catch (requestError) {
      console.error('Failed to delete user:', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setDeleteLoading(false)
    }
  }

  // ==========================================================
  // CLOSE ACTION MENU
  // ==========================================================

  useEffect(() => {
    const handleClick = () => {
      setOpenMenuId(null)
    }

    if (openMenuId) {
      document.addEventListener('click', handleClick)
    }

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [openMenuId])

  // ==========================================================
  // IMAGE URL
  // ==========================================================

  const getPhotoUrl = (photoUrl: string | null): string | null => {
    if (!photoUrl) {
      return null
    }

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl
    }

    return `${API_BASE_URL}${photoUrl}`
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-linear-to-br from-slate-100 via-indigo-50 to-sky-50 text-slate-900 dark:bg-slate-50 dark:text-black">
      {/* ========================================================
          BACKGROUND GLOW
      ======================================================== */}

      <div className="pointer-events-none fixed -left-40 top-10 h-96 w-96 rounded-full bg-indigo-400/20 blur-[130px]" />

      <div className="pointer-events-none fixed right-0 top-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-[140px]" />

      <div className="pointer-events-none fixed bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-400/15 blur-[130px]" />

      <div className="pointer-events-none fixed bottom-10 right-1/4 h-64 w-64 rounded-full bg-pink-400/10 blur-[120px]" />

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur-2xl dark:border-slate-200 dark:bg-white/4">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-purple-400/15 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-black shadow-lg shadow-indigo-500/25">
                  <UserRound size={19} />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
                  Administration
                </p>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-black">
                Manage Users
              </h1>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
                Manage student, faculty, and administrator accounts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchUsers()}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserRound size={15} />}
              Refresh Users
            </button>
          </div>
        </section>

        {/* ======================================================
            ALERTS
        ====================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-300/40 bg-red-100/60 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-500/5 backdrop-blur-xl dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              className="ml-auto rounded-lg p-1 transition hover:bg-red-500/10"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-100/60 px-4 py-3 text-sm text-emerald-700 shadow-lg shadow-emerald-500/5 backdrop-blur-xl dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={18} />

            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="ml-auto rounded-lg p-1 transition hover:bg-emerald-500/10"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={totalUsers}
            icon={<UserRound size={19} />}
            gradient="from-indigo-500/20 via-purple-500/10 to-cyan-500/10"
            iconStyle="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          />

          <StatCard
            label="Active Users"
            value={activeUsers}
            icon={<UserCheck size={19} />}
            gradient="from-emerald-500/20 via-teal-500/10 to-cyan-500/10"
            iconStyle="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          />

          <StatCard
            label="Students"
            value={studentUsers}
            icon={<UserRound size={19} />}
            gradient="from-blue-500/20 via-cyan-500/10 to-sky-500/10"
            iconStyle="bg-blue-500/15 text-blue-600 dark:text-blue-400"
          />

          <StatCard
            label="Faculty"
            value={facultyUsers}
            icon={<ShieldCheck size={19} />}
            gradient="from-purple-500/20 via-pink-500/10 to-fuchsia-500/10"
            iconStyle="bg-purple-500/15 text-purple-600 dark:text-purple-400"
          />
        </div>

        {/* ======================================================
            TABLE GLASS CARD
        ====================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/50 shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl dark:border-slate-200 dark:bg-neutral-900/60">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-500/70 to-transparent" />

          {/* ====================================================
              FILTER BAR
          ==================================================== */}

          <div className="border-b border-slate-200 bg-white/70 px-4 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* Search */}

              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, login ID or email..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs text-black shadow-sm outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              {/* Role */}

              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as FilterRole)}
                  className="w-full appearance-none rounded-xl border border-white/70 bg-white/50 py-3 pl-3.5 pr-10 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur-xl focus:border-indigo-400 dark:border-slate-200 dark:bg-white/4 dark:text-slate-700"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admins</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>

              {/* Status */}

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
                  className="w-full appearance-none rounded-xl border border-white/70 bg-white/50 py-3 pl-3.5 pr-10 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur-xl focus:border-indigo-400 dark:border-slate-200 dark:bg-white/4 dark:text-slate-700"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* ====================================================
              LOADING
          ==================================================== */}

          {loading ? (
            <div className="flex min-h-105 items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 shadow-lg shadow-indigo-500/10">
                  <Loader2 size={27} className="animate-spin" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-700">
                  Loading users...
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Fetching accounts from the backend.
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* ==================================================
               EMPTY
            ================================================== */

            <div className="flex min-h-105 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/15 bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 text-indigo-500 shadow-lg shadow-indigo-500/5">
                <UserRound size={27} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">
                No users found
              </h3>

              <p className="mt-1 max-w-sm text-xs text-slate-600 dark:text-slate-500">
                No users match your current search or filters.
              </p>
            </div>
          ) : (
            /* ==================================================
               TABLE
            ================================================== */

            <div className="overflow-x-auto">
              <table className="w-full min-w-225 bg-white text-black">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-black">
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700`}>User</th>
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700`}>
                      Login ID
                    </th>
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700`}>Role</th>
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700`}>Status</th>
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700`}>
                      Verification
                    </th>
                    <th className={`${tableHeader} text-slate-700 dark:text-slate-700 text-right`}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/50 dark:divide-white/5 bg-white text-black">
                  {filteredUsers.map((user) => {
                    const photoUrl = getPhotoUrl(user.photo_url)

                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-indigo-500/3.5 dark:hover:bg-white/2.5 text-black"
                      >
                        {/* USER */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={user.full_name || user.login_id}
                                className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-white/80 dark:ring-white/10"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 text-indigo-600 shadow-sm ring-1 ring-indigo-500/10 dark:text-indigo-400">
                                {user.role === 'admin' ? (
                                  <ShieldCheck size={18} />
                                ) : (
                                  <UserRound size={18} />
                                )}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                                {user.full_name || user.login_id}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-slate-700 dark:text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* LOGIN ID */}

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-500/10 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-700">
                            {user.login_id}
                          </span>
                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <StatusBadge active={user.is_active} />
                        </td>

                        {/* VERIFICATION */}

                        <td className="px-5 py-4">
                          {user.is_verified ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 size={13} />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/15 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <AlertCircle size={13} />
                              Unverified
                            </span>
                          )}
                        </td>

                        {/* ACTION */}

                        <td className="relative px-5 py-4 text-right">
                          {actionLoadingId === user.id ? (
                            <Loader2 size={17} className="ml-auto animate-spin text-indigo-500" />
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()

                                  setOpenMenuId((previous) =>
                                    previous === user.id ? null : user.id
                                  )
                                }}
                                className="rounded-xl border border-white/70 bg-white/40 p-2 text-slate-600 shadow-sm backdrop-blur-xl transition hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-600 dark:border-slate-200 dark:bg-white/3 dark:text-slate-500 dark:hover:text-white"
                                aria-label={`Actions for ${user.login_id}`}
                              >
                                <MoreVertical size={17} />
                              </button>

                              {openMenuId === user.id && (
                                <div
                                  onClick={(event) => event.stopPropagation()}
                                  className="absolute right-5 top-14 z-30 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-lg shadow-indigo-500/10"
                                >
                                  {/* STATUS */}

                                  <button
                                    type="button"
                                    onClick={() => void toggleUserStatus(user)}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-indigo-500/10 hover:text-indigo-600 dark:text-slate-700 dark:hover:text-white"
                                  >
                                    {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}

                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                  </button>

                                  {/* PASSWORD */}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setResetPasswordUser(user)
                                      setNewPassword('')
                                      setError('')
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-purple-500/10 hover:text-purple-600 dark:text-slate-700 dark:hover:text-purple-400"
                                  >
                                    <KeyRound size={15} />
                                    Reset Password
                                  </button>

                                  <div className="my-1 border-t border-slate-200/70 dark:border-white/6" />

                                  {/* DELETE */}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setDeleteUser(user)
                                      setError('')
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                                  >
                                    <Trash2 size={15} />
                                    Delete User
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ====================================================
              FOOTER
          ==================================================== */}

          {!loading && filteredUsers.length > 0 && (
            <div className="border-t border-indigo-100 bg-linear-to-r from-indigo-50 via-white to-cyan-50 px-5 py-3.5 backdrop-blur-xl">
              <p className="text-[11px] text-slate-600 dark:text-slate-500">
                Showing{' '}
                <span className="font-bold text-slate-800 dark:text-slate-700">
                  {filteredUsers.length}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-700">{users.length}</span>{' '}
                users
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================
          RESET PASSWORD MODAL
      ======================================================== */}

      {resetPasswordUser && (
        <ModalOverlay>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-indigo-500/20 backdrop-blur-2xl dark:border-slate-200 dark:bg-neutral-900/90">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-400">
                  <KeyRound size={20} />
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                  Reset Password
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-500">
                  Set a new password for{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-800">
                    {resetPasswordUser.login_id}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="new-password"
                className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-700"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-200 dark:bg-white/4 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                disabled={resetLoading}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-500/10 dark:text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={resetLoading || newPassword.length < 8}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading && <Loader2 size={14} className="animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ========================================================
          DELETE MODAL
      ======================================================== */}

      {deleteUser && (
        <ModalOverlay>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-6 shadow-2xl shadow-red-500/10 backdrop-blur-2xl dark:border-slate-200 dark:bg-neutral-900/90">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <Trash2 size={20} />
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                  Delete User
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-500">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-800">
                    {deleteUser.login_id}
                  </span>
                  ?
                </p>

                <p className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                disabled={deleteLoading}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-500/10 dark:text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteUser()}
                disabled={deleteLoading}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon,
  gradient,
  iconStyle,
}: {
  label: string
  value: number
  icon: ReactNode
  gradient: string
  iconStyle: string
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-linear-to-br ${gradient} p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-200 dark:bg-white/4`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl transition duration-500 group-hover:scale-150 dark:bg-white/5" />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-black">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconStyle}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ROLE BADGE
// ============================================================

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin:
      'border-purple-500/20 bg-linear-to-r from-purple-500/15 to-pink-500/10 text-purple-700 dark:text-purple-400',
    faculty:
      'border-blue-500/20 bg-linear-to-r from-blue-500/15 to-cyan-500/10 text-blue-700 dark:text-blue-400',
    student:
      'border-indigo-500/20 bg-linear-to-r from-indigo-500/15 to-violet-500/10 text-indigo-700 dark:text-indigo-400',
  }

  const labels: Record<UserRole, string> = {
    admin: 'Admin',
    faculty: 'Faculty',
    student: 'Student',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${styles[role]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {labels[role]}
    </span>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${
        active
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-400'
        }`}
      />

      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// ============================================================
// MODAL OVERLAY
// ============================================================

function ModalOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/40 p-4 backdrop-blur-md">
      {children}
    </div>
  )
}

// ============================================================
// TABLE HEADER
// ============================================================

const tableHeader = 'px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em]'

// ============================================================
// EXPORT
// ============================================================

export default UsersPage
