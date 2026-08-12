import {
  Bell,
  CalendarDays,
  Check,
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Notice {
  id: string
  title: string
  content: string
  category: string
  priority: string
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface NoticeForm {
  title: string
  content: string
  category: string
  priority: string
  is_published: boolean
  expires_at: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const emptyForm: NoticeForm = {
  title: '',
  content: '',
  category: 'general',
  priority: 'normal',
  is_published: false,
  expires_at: '',
}

const categoryOptions = [
  'general',
  'academic',
  'attendance',
  'exam',
  'event',
  'holiday',
  'important',
]

const priorityOptions = ['low', 'normal', 'high', 'urgent']

function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)

  const [form, setForm] = useState<NoticeForm>(emptyForm)

  // ============================================================
  // LOAD NOTICES
  // ============================================================

  const fetchNotices = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_BASE_URL}/admin/notices`)

      if (!response.ok) {
        throw new Error(`Failed to load notices (${response.status})`)
      }

      const data = await response.json()

      setNotices(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotices()
  }, [])

  // ============================================================
  // FORM
  // ============================================================

  const openCreateModal = () => {
    setEditingNotice(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice)

    setForm({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      priority: notice.priority,
      is_published: notice.is_published,
      expires_at: notice.expires_at ? notice.expires_at.slice(0, 16) : '',
    })

    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setIsModalOpen(false)
    setEditingNotice(null)
    setForm(emptyForm)
  }

  const handleFormChange = (field: keyof NoticeForm, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // ============================================================
  // CREATE / UPDATE
  // ============================================================

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim()) {
      setError('Notice title is required.')
      return
    }

    if (!form.content.trim()) {
      setError('Notice content is required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        priority: form.priority,
        is_published: form.is_published,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }

      const url = editingNotice
        ? `${API_BASE_URL}/admin/notices/${editingNotice.id}`
        : `${API_BASE_URL}/admin/notices`

      const method = editingNotice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to save notice.')
      }

      setSuccess(editingNotice ? 'Notice updated successfully.' : 'Notice created successfully.')

      setIsModalOpen(false)
      setEditingNotice(null)
      setForm(emptyForm)

      await fetchNotices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save notice.')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // PUBLISH / UNPUBLISH
  // ============================================================

  const togglePublish = async (notice: Notice) => {
    try {
      setError('')
      setSuccess('')

      const response = await fetch(`${API_BASE_URL}/admin/notices/${notice.id}/publish`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to change publication status.')
      }

      setSuccess(
        data.is_published ? 'Notice published successfully.' : 'Notice unpublished successfully.'
      )

      await fetchNotices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change publication status.')
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  const deleteNotice = async (notice: Notice) => {
    const confirmed = window.confirm(`Delete "${notice.title}"? This action cannot be undone.`)

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')

      const response = await fetch(`${API_BASE_URL}/admin/notices/${notice.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to delete notice.')
      }

      setSuccess('Notice deleted successfully.')

      await fetchNotices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete notice.')
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDate = (value: string | null) => {
    if (!value) return '—'

    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/20 bg-red-500/10 text-red-700'

      case 'high':
        return 'border-orange-500/20 bg-orange-500/10 text-orange-700'

      case 'low':
        return 'border-slate-500/20 bg-slate-500/10 text-slate-700'

      default:
        return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700'
    }
  }

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'important':
        return 'border-purple-500/20 bg-purple-500/10 text-purple-700'

      case 'exam':
        return 'border-blue-500/20 bg-blue-500/10 text-blue-700'

      case 'attendance':
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'

      case 'holiday':
        return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700'

      case 'event':
        return 'border-pink-500/20 bg-pink-500/10 text-pink-700'

      default:
        return 'border-slate-500/20 bg-slate-500/10 text-slate-700'
    }
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-full bg-transparent p-4 text-black sm:p-6 lg:p-8">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600">
              <Bell size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-black">Notices</h1>

              <p className="mt-1 text-sm text-slate-600">
                Create and manage announcements for students and faculty.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchNotices()}
            disabled={loading}
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-white/70
              bg-white/65 px-4 py-2.5
              text-sm font-semibold text-black
              shadow-sm backdrop-blur-xl
              transition
              hover:bg-white
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-indigo-600 px-4 py-2.5
              text-sm font-bold text-white
              shadow-lg shadow-indigo-500/20
              transition
              hover:bg-indigo-700
            "
          >
            <Plus size={17} />
            New Notice
          </button>
        </div>
      </div>

      {/* ======================================================
          ALERTS
      ======================================================= */}

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700">
          <X size={17} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">
          <Check size={17} />
          <span>{success}</span>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ======================================================= */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Total Notices
          </p>

          <p className="mt-2 text-2xl font-black text-black">{notices.length}</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Published</p>

          <p className="mt-2 text-2xl font-black text-black">
            {notices.filter((notice) => notice.is_published).length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Drafts</p>

          <p className="mt-2 text-2xl font-black text-black">
            {notices.filter((notice) => !notice.is_published).length}
          </p>
        </div>
      </div>

      {/* ======================================================
          TABLE
      ======================================================= */}

      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-xl shadow-indigo-500/5 backdrop-blur-2xl">
        <div className="border-b border-white/70 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-indigo-600" />

            <div>
              <h2 className="text-sm font-black text-black">Notice Management</h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Manage announcements visible across the system.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
              <RefreshCw size={18} className="animate-spin text-indigo-600" />
              Loading notices...
            </div>
          </div>
        ) : notices.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
              <Bell size={24} />
            </div>

            <h3 className="mt-4 text-base font-bold text-black">No notices yet</h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create your first notice to publish announcements for students and faculty.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="
                mt-4 inline-flex items-center
                gap-2 rounded-xl
                bg-indigo-600 px-4 py-2.5
                text-sm font-bold text-white
                transition hover:bg-indigo-700
              "
            >
              <Plus size={16} />
              Create Notice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/70 bg-white/40">
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Notice
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Category
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Priority
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Published
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-black">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {notices.map((notice) => (
                  <tr
                    key={notice.id}
                    className="
                      border-b border-white/60
                      bg-white/20
                      transition
                      hover:bg-white/45
                    "
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-sm">
                        <p className="font-bold text-black">{notice.title}</p>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {notice.content}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-flex rounded-lg
                          border px-2.5 py-1
                          text-[10px] font-bold
                          uppercase tracking-wide
                          ${getCategoryClass(notice.category)}
                        `}
                      >
                        {notice.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-flex rounded-lg
                          border px-2.5 py-1
                          text-[10px] font-bold
                          uppercase tracking-wide
                          ${getPriorityClass(notice.priority)}
                        `}
                      >
                        {notice.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void togglePublish(notice)}
                        className={`
                          inline-flex items-center
                          gap-1.5 rounded-lg
                          border px-2.5 py-1
                          text-[10px] font-bold
                          uppercase tracking-wide
                          transition
                          ${
                            notice.is_published
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                              : 'border-slate-500/20 bg-slate-500/10 text-slate-700 hover:bg-slate-500/20'
                          }
                        `}
                      >
                        <span
                          className={`
                            h-1.5 w-1.5 rounded-full
                            ${notice.is_published ? 'bg-emerald-500' : 'bg-slate-500'}
                          `}
                        />

                        {notice.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {formatDate(notice.published_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(notice)}
                          title="Edit notice"
                          className="
                            rounded-lg border
                            border-indigo-500/20
                            bg-indigo-500/10
                            p-2 text-indigo-700
                            transition
                            hover:bg-indigo-500/20
                          "
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteNotice(notice)}
                          title="Delete notice"
                          className="
                            rounded-lg border
                            border-red-500/20
                            bg-red-500/10
                            p-2 text-red-700
                            transition
                            hover:bg-red-500/20
                          "
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================
          CREATE / EDIT MODAL
      ======================================================= */}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-2xl shadow-indigo-500/20 backdrop-blur-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-black">
                  {editingNotice ? 'Edit Notice' : 'Create Notice'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingNotice
                    ? 'Update the announcement details.'
                    : 'Create a new announcement for your users.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="
                  rounded-xl p-2
                  text-slate-500
                  transition
                  hover:bg-slate-100
                  hover:text-black
                "
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Form */}

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Title */}

                <div>
                  <label
                    htmlFor="notice-title"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-black"
                  >
                    Title
                  </label>

                  <input
                    id="notice-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => handleFormChange('title', event.target.value)}
                    placeholder="Enter notice title"
                    maxLength={200}
                    className="
                      w-full rounded-xl
                      border border-slate-200
                      bg-white
                      px-4 py-3
                      text-sm text-black
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-400
                      focus:ring-2
                      focus:ring-indigo-500/10
                    "
                  />
                </div>

                {/* Content */}

                <div>
                  <label
                    htmlFor="notice-content"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-black"
                  >
                    Content
                  </label>

                  <textarea
                    id="notice-content"
                    value={form.content}
                    onChange={(event) => handleFormChange('content', event.target.value)}
                    placeholder="Write the notice content..."
                    rows={6}
                    className="
                      w-full resize-none rounded-xl
                      border border-slate-200
                      bg-white
                      px-4 py-3
                      text-sm leading-6 text-black
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-400
                      focus:ring-2
                      focus:ring-indigo-500/10
                    "
                  />
                </div>

                {/* Category / Priority */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="notice-category"
                      className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-black"
                    >
                      Category
                    </label>

                    <select
                      id="notice-category"
                      value={form.category}
                      onChange={(event) => handleFormChange('category', event.target.value)}
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-4 py-3
                        text-sm text-black
                        outline-none
                        focus:border-indigo-400
                        focus:ring-2
                        focus:ring-indigo-500/10
                      "
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="notice-priority"
                      className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-black"
                    >
                      Priority
                    </label>

                    <select
                      id="notice-priority"
                      value={form.priority}
                      onChange={(event) => handleFormChange('priority', event.target.value)}
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-4 py-3
                        text-sm text-black
                        outline-none
                        focus:border-indigo-400
                        focus:ring-2
                        focus:ring-indigo-500/10
                      "
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expiry */}

                <div>
                  <label
                    htmlFor="notice-expiry"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-black"
                  >
                    Expiry Date
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="notice-expiry"
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(event) => handleFormChange('expires_at', event.target.value)}
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white
                        py-3 pl-10 pr-4
                        text-sm text-black
                        outline-none
                        focus:border-indigo-400
                        focus:ring-2
                        focus:ring-indigo-500/10
                      "
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    Leave empty if the notice should not expire.
                  </p>
                </div>

                {/* Publish */}

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => handleFormChange('is_published', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <div>
                    <p className="text-sm font-bold text-black">Publish immediately</p>

                    <p className="text-xs text-slate-500">
                      Published notices can be viewed on the public home page.
                    </p>
                  </div>
                </label>
              </div>

              {/* Form Actions */}

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200/70 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    rounded-xl border
                    border-slate-200
                    bg-white px-5 py-2.5
                    text-sm font-bold text-black
                    transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    inline-flex items-center gap-2
                    rounded-xl bg-indigo-600
                    px-5 py-2.5
                    text-sm font-bold text-white
                    shadow-lg
                    shadow-indigo-500/20
                    transition
                    hover:bg-indigo-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}

                  {saving ? 'Saving...' : editingNotice ? 'Update Notice' : 'Create Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminNoticesPage
