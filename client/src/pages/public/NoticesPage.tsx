import {
  AlertCircle,
  Bell,
  CalendarDays,
  ChevronRight,
  Info,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import PublicNavbar from '../../components/navigation/PublicNavbar'

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

const API_URL = 'http://localhost:8000'

function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)

  // ============================================================
  // LOAD PUBLIC NOTICES
  // ============================================================

  useEffect(() => {
    let cancelled = false

    const loadNotices = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/notices`)

        if (!response.ok) {
          throw new Error('Unable to load notices.')
        }

        const data: Notice[] = await response.json()

        if (!cancelled) {
          setNotices(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load notices.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadNotices()

    return () => {
      cancelled = true
    }
  }, [])

  // ============================================================
  // CATEGORIES
  // ============================================================

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(notices.map((notice) => notice.category).filter(Boolean))
    )

    return ['all', ...uniqueCategories]
  }, [notices])

  // ============================================================
  // FILTER NOTICES
  // ============================================================

  const filteredNotices = useMemo(() => {
    if (selectedCategory === 'all') {
      return notices
    }

    return notices.filter((notice) => notice.category === selectedCategory)
  }, [notices, selectedCategory])

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (value: string | null) => {
    if (!value) {
      return 'Not specified'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Not specified'
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return 'Not specified'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Not specified'
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ============================================================
  // CATEGORY ICON
  // ============================================================

  const getCategoryIcon = (value: string) => {
    const normalized = value.toLowerCase()

    if (normalized.includes('urgent') || normalized.includes('important')) {
      return ShieldAlert
    }

    if (normalized.includes('event') || normalized.includes('academic')) {
      return CalendarDays
    }

    if (normalized.includes('announcement') || normalized.includes('general')) {
      return Megaphone
    }

    return Info
  }

  // ============================================================
  // CATEGORY STYLE
  // ============================================================

  const getCategoryStyle = (value: string) => {
    const normalized = value.toLowerCase()

    if (normalized.includes('urgent') || normalized.includes('important')) {
      return 'border-rose-200 bg-rose-50 text-rose-600'
    }

    if (normalized.includes('event') || normalized.includes('academic')) {
      return 'border-indigo-200 bg-indigo-50 text-indigo-600'
    }

    if (normalized.includes('announcement') || normalized.includes('general')) {
      return 'border-sky-200 bg-sky-50 text-sky-600'
    }

    return 'border-slate-200 bg-slate-50 text-slate-600'
  }

  // ============================================================
  // PRIORITY STYLE
  // ============================================================

  const getPriorityStyle = (value: string) => {
    const normalized = value.toLowerCase()

    if (normalized === 'urgent' || normalized === 'high') {
      return 'border-rose-200 bg-rose-50 text-rose-600'
    }

    if (normalized === 'medium') {
      return 'border-amber-200 bg-amber-50 text-amber-600'
    }

    return 'border-emerald-200 bg-emerald-50 text-emerald-600'
  }

  // ============================================================
  // RETRY
  // ============================================================

  const handleRetry = () => {
    window.location.reload()
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-900">
      {/* ========================================================
          PUBLIC NAVBAR
      ========================================================= */}

      <PublicNavbar />

      {/* ========================================================
          BACKGROUND GLOW
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="
            absolute
            left-[8%]
            top-24
            h-72
            w-72
            rounded-full
            bg-indigo-600/20
            blur-[110px]
          "
        />

        <div
          className="
            absolute
            right-[8%]
            top-[35%]
            h-80
            w-80
            rounded-full
            bg-red-500/10
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-0
            left-1/2
            h-72
            w-72
            -translate-x-1/2
            rounded-full
            bg-blue-500/10
            blur-[110px]
          "
        />
      </div>

      {/* ========================================================
          MAIN
      ========================================================= */}

      <main
        className="
        relative
        mx-auto
        w-full
        max-w-5xl
        px-4
        pb-16
        pt-24
        sm:px-6
        lg:px-8
      "
      >
        {/* ======================================================
            NOTICE BOARD
        ======================================================= */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white
            shadow-[0_0_80px_rgba(99,102,241,0.16)]
          "
        >
          {/* ====================================================
              BOARD HEADER
          ===================================================== */}

          <div
            className="
              border-b
              border-slate-200
              px-5
              py-5
              sm:px-7
            "
          >
            <div
              className="
              flex
              items-center
              justify-between
              gap-4
            "
            >
              <div
                className="
                flex
                min-w-0
                items-center
                gap-3
              "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    text-indigo-600
                  "
                >
                  <Bell size={19} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <p
                    className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-widest
                    text-indigo-500
                  "
                  >
                    Campus Updates
                  </p>

                  <h1
                    className="
                    mt-0.5
                    truncate
                    text-xl
                    font-bold
                    text-slate-900
                    sm:text-2xl
                  "
                  >
                    Notice Board
                  </h1>
                </div>
              </div>

              <div
                className="
                hidden
                shrink-0
                rounded-full
                border
                border-slate-200
                bg-slate-50
                px-3
                py-1.5
                text-[10px]
                font-semibold
                text-slate-500
                sm:block
              "
              >
                Latest Notices
              </div>
            </div>
          </div>

          {/* ====================================================
              FILTERS
          ===================================================== */}

          {!loading && !error && notices.length > 0 && (
            <div
              className="
                  border-b
                  border-slate-100
                  px-5
                  py-3
                  sm:px-7
                "
            >
              <div
                className="
                  flex
                  gap-2
                  overflow-x-auto
                  pb-0.5
                "
              >
                {categories.map((item) => {
                  const active = selectedCategory === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedCategory(item)}
                      className={`
                          shrink-0
                          rounded-lg
                          border
                          px-3
                          py-1.5
                          text-[10px]
                          font-semibold
                          capitalize
                          transition-all
                          duration-200
                          ${
                            active
                              ? `
                                border-indigo-200
                                bg-indigo-50
                                text-indigo-700
                              `
                              : `
                                border-transparent
                                text-slate-400
                                hover:border-slate-200
                                hover:bg-slate-50
                                hover:text-slate-700
                              `
                          }
                        `}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ====================================================
              CONTENT
          ===================================================== */}

          <div className="p-4 sm:p-6">
            {/* ==================================================
                LOADING
            =================================================== */}

            {loading && (
              <div
                className="
                flex
                min-h-80
                flex-col
                items-center
                justify-center
              "
              >
                <div
                  className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-indigo-50
                  text-indigo-500
                "
                >
                  <RefreshCw size={22} className="animate-spin" />
                </div>

                <p
                  className="
                  mt-3
                  text-xs
                  font-medium
                  text-slate-400
                "
                >
                  Loading notices...
                </p>
              </div>
            )}

            {/* ==================================================
                ERROR
            =================================================== */}

            {!loading && error && (
              <div
                className="
                flex
                min-h-80
                flex-col
                items-center
                justify-center
                text-center
              "
              >
                <div
                  className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-rose-50
                  text-rose-500
                "
                >
                  <AlertCircle size={22} />
                </div>

                <h2
                  className="
                  mt-4
                  text-sm
                  font-bold
                  text-slate-900
                "
                >
                  Unable to load notices
                </h2>

                <p
                  className="
                  mt-1
                  max-w-sm
                  text-xs
                  leading-5
                  text-slate-400
                "
                >
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleRetry}
                  className="
                    mt-4
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3.5
                    py-2
                    text-[10px]
                    font-semibold
                    text-slate-600
                    shadow-sm
                    transition
                    hover:border-indigo-200
                    hover:bg-indigo-50
                    hover:text-indigo-700
                  "
                >
                  <RefreshCw size={13} />
                  Try Again
                </button>
              </div>
            )}

            {/* ==================================================
                EMPTY
            =================================================== */}

            {!loading && !error && filteredNotices.length === 0 && (
              <div
                className="
                  flex
                  min-h-80
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-slate-100
                    text-slate-400
                  "
                >
                  <Bell size={22} />
                </div>

                <h2
                  className="
                    mt-4
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  No notices available
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  There are currently no published notices.
                </p>
              </div>
            )}

            {/* ==================================================
                NOTICE LIST
            =================================================== */}

            {!loading && !error && filteredNotices.length > 0 && (
              <div className="space-y-3">
                {filteredNotices.map((notice) => {
                  const Icon = getCategoryIcon(notice.category)

                  return (
                    <article
                      key={notice.id}
                      className="
                          group
                          rounded-2xl
                          border
                          border-slate-200
                          bg-white
                          p-4
                          shadow-sm
                          transition-all
                          duration-200
                          hover:-translate-y-0.5
                          hover:border-indigo-200
                          hover:shadow-[0_8px_30px_rgba(99,102,241,0.10)]
                        "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        {/* Notice icon */}

                        <div
                          className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-indigo-50
                              text-indigo-600
                            "
                        >
                          <Icon size={17} strokeWidth={1.8} />
                        </div>

                        {/* Notice information */}

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          {/* Badges */}

                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-2
                            "
                          >
                            <span
                              className="
                                  rounded-md
                                  bg-slate-100
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-slate-500
                                "
                            >
                              {notice.category}
                            </span>

                            <span
                              className={`
                                  rounded-md
                                  border
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  ${getPriorityStyle(notice.priority)}
                                `}
                            >
                              {notice.priority}
                            </span>
                          </div>

                          {/* Title */}

                          <h2
                            className="
                              mt-2
                              text-sm
                              font-bold
                              leading-5
                              text-slate-900
                              transition-colors
                              group-hover:text-indigo-700
                            "
                          >
                            {notice.title}
                          </h2>

                          {/* Content */}

                          <p
                            className="
                              mt-1
                              line-clamp-2
                              text-xs
                              leading-5
                              text-slate-500
                            "
                          >
                            {notice.content}
                          </p>

                          {/* Footer */}

                          <div
                            className="
                              mt-3
                              flex
                              flex-wrap
                              items-center
                              justify-between
                              gap-3
                            "
                          >
                            <span
                              className="
                                flex
                                items-center
                                gap-1.5
                                text-[9px]
                                font-medium
                                text-slate-400
                              "
                            >
                              <CalendarDays size={11} />
                              {formatDate(notice.published_at)}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedNotice(notice)}
                              className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  rounded-lg
                                  px-2.5
                                  py-1.5
                                  text-[9px]
                                  font-bold
                                  text-indigo-600
                                  transition
                                  hover:bg-indigo-50
                                "
                            >
                              Read More
                              <ChevronRight size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            FOOTER NOTE
        ======================================================= */}

        {!loading && !error && filteredNotices.length > 0 && (
          <div
            className="
              mt-4
              text-center
            "
          >
            <p
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-widest
                text-slate-600
              "
            >
              Official Campus Announcements
            </p>
          </div>
        )}
      </main>

      {/* ========================================================
          NOTICE DETAIL MODAL
      ========================================================= */}

      {selectedNotice !== null && (
        <div
          className="
            fixed
            inset-0
            z-100
            flex
            items-center
            justify-center
            bg-black/50
            p-4
            backdrop-blur-md
          "
        >
          {/* Overlay */}

          <button
            type="button"
            aria-label="Close notice"
            onClick={() => setSelectedNotice(null)}
            className="
              absolute
              inset-0
              cursor-default
            "
          />

          {/* Modal */}

          <div
            className="
              relative
              z-10
              max-h-[90vh]
              w-full
              max-w-xl
              overflow-y-auto
              rounded-3xl
              border
              border-white/20
              bg-white
              shadow-[0_0_80px_rgba(99,102,241,0.25)]
            "
          >
            {/* Modal header */}

            <div
              className="
              flex
              items-start
              justify-between
              gap-4
              border-b
              border-slate-100
              p-5
            "
            >
              <div
                className="
                flex
                min-w-0
                items-start
                gap-3
              "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    text-indigo-600
                  "
                >
                  <Bell size={18} />
                </div>

                <div className="min-w-0">
                  <div
                    className="
                    flex
                    flex-wrap
                    gap-2
                  "
                  >
                    <span
                      className={`
                        rounded-md
                        border
                        px-2
                        py-1
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-wider
                        ${getCategoryStyle(selectedNotice.category)}
                      `}
                    >
                      {selectedNotice.category}
                    </span>

                    <span
                      className={`
                        rounded-md
                        border
                        px-2
                        py-1
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-wider
                        ${getPriorityStyle(selectedNotice.priority)}
                      `}
                    >
                      {selectedNotice.priority}
                    </span>
                  </div>

                  <h2
                    className="
                    mt-2
                    text-base
                    font-bold
                    leading-6
                    text-slate-900
                  "
                  >
                    {selectedNotice.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedNotice(null)}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  text-slate-400
                  transition
                  hover:bg-slate-50
                  hover:text-slate-700
                "
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal content */}

            <div className="p-5">
              <p
                className="
                whitespace-pre-line
                text-sm
                leading-7
                text-slate-600
              "
              >
                {selectedNotice.content}
              </p>

              <div
                className="
                mt-5
                border-t
                border-slate-100
                pt-4
              "
              >
                <div
                  className="
                  flex
                  items-center
                  gap-1.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-widest
                  text-slate-400
                "
                >
                  <CalendarDays size={11} />
                  Published
                </div>

                <p
                  className="
                  mt-1.5
                  text-xs
                  font-semibold
                  text-slate-600
                "
                >
                  {formatDateTime(selectedNotice.published_at)}
                </p>
              </div>

              {selectedNotice.expires_at && (
                <div
                  className="
                  mt-3
                  border-t
                  border-slate-100
                  pt-3
                "
                >
                  <div
                    className="
                    flex
                    items-center
                    gap-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-widest
                    text-slate-400
                  "
                  >
                    <CalendarDays size={11} />
                    Expires
                  </div>

                  <p
                    className="
                    mt-1.5
                    text-xs
                    font-semibold
                    text-slate-600
                  "
                  >
                    {formatDateTime(selectedNotice.expires_at)}
                  </p>
                </div>
              )}

              <div
                className="
                mt-5
                flex
                justify-end
              "
              >
                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-2
                    text-[10px]
                    font-bold
                    text-slate-600
                    shadow-sm
                    transition
                    hover:border-indigo-200
                    hover:bg-indigo-50
                    hover:text-indigo-700
                  "
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NoticesPage
