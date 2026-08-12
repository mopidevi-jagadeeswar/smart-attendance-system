import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface Holiday {
  id: number
  date: string
  name: string
  holiday_type: string
  description: string | null
  is_active: boolean
}

interface CalendarEvent {
  id: string | number
  title: string
  date: string
  type: 'event'
  description?: string
  location?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const calendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'Academic Orientation',
    date: '2026-08-20',
    type: 'event',
    description: 'Introductory program for final year and incoming batches.',
    location: 'Main Auditorium',
  },
  {
    id: 2,
    title: 'Faculty Meeting',
    date: '2026-08-25',
    type: 'event',
    description: 'Monthly faculty review meeting.',
    location: 'Conference Hall',
  },
]

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isSameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate()

const isToday = (date: Date) => isSameDay(date, new Date())

const isSameMonth = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth()

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1)

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const startOfWeek = (date: Date) => {
  const result = new Date(date)

  result.setDate(result.getDate() - result.getDay())
  result.setHours(0, 0, 0, 0)

  return result
}

const endOfWeek = (date: Date) => {
  const result = new Date(date)

  result.setDate(result.getDate() + (6 - result.getDay()))
  result.setHours(23, 59, 59, 999)

  return result
}

const eachDayOfInterval = (start: Date, end: Date) => {
  const days: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const fetchHolidays = async (year: number, signal?: AbortSignal): Promise<Holiday[]> => {
  const url = `${API_BASE_URL}/calendar/holidays?year=${year}`

  console.log('Fetching holidays from Smart Attendance API:', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  console.log('Calendar API status:', response.status)

  if (!response.ok) {
    const message = await response.text()

    throw new Error(message || `Calendar API returned HTTP ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('Calendar API returned invalid holiday data.')
  }

  console.log(`Loaded ${data.length} holidays from PostgreSQL.`)

  return data as Holiday[]
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

function PublicCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /*
  |--------------------------------------------------------------------------
  | CURRENT YEAR
  |--------------------------------------------------------------------------
  */

  const currentYear = currentMonth.getFullYear()

  /*
  |--------------------------------------------------------------------------
  | LOAD HOLIDAYS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller = new AbortController()

    const loadHolidays = async () => {
      setError(null)

      try {
        const data = await fetchHolidays(currentYear, controller.signal)

        if (!controller.signal.aborted) {
          setHolidays(data)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        console.error('Failed to load holidays:', err)

        if (!controller.signal.aborted) {
          setHolidays([])

          setError(err instanceof Error ? err.message : 'Unable to load holidays.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadHolidays()

    return () => {
      controller.abort()
    }
  }, [currentYear])

  /*
  |--------------------------------------------------------------------------
  | RETRY
  |--------------------------------------------------------------------------
  */

  const retryFetchHolidays = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchHolidays(currentYear)

      setHolidays(data)
    } catch (err) {
      console.error('Failed to reload holidays:', err)

      setHolidays([])

      setError(err instanceof Error ? err.message : 'Unable to load holidays.')
    } finally {
      setIsLoading(false)
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CALENDAR DAYS
  |--------------------------------------------------------------------------
  */

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))

    return eachDayOfInterval(start, end)
  }, [currentMonth])

  /*
  |--------------------------------------------------------------------------
  | CURRENT MONTH HOLIDAYS
  |--------------------------------------------------------------------------
  */

  const currentMonthHolidays = useMemo(() => {
    return holidays
      .filter((holiday) => {
        const date = new Date(`${holiday.date}T00:00:00`)

        return isSameMonth(date, currentMonth)
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [holidays, currentMonth])

  /*
  |--------------------------------------------------------------------------
  | CURRENT MONTH EVENTS
  |--------------------------------------------------------------------------
  */

  const currentMonthEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => {
        const date = new Date(`${event.date}T00:00:00`)

        return isSameMonth(date, currentMonth)
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [currentMonth])

  /*
  |--------------------------------------------------------------------------
  | DAY DATA
  |--------------------------------------------------------------------------
  */

  const getHolidaysForDay = (day: Date) => {
    const key = formatDateKey(day)

    return holidays.filter((holiday) => holiday.date === key)
  }

  const getEventsForDay = (day: Date) => {
    const key = formatDateKey(day)

    return calendarEvents.filter((event) => event.date === key)
  }

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION
  |--------------------------------------------------------------------------
  */

  const goToPreviousMonth = () => {
    setCurrentMonth((month) => addMonths(month, -1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((month) => addMonths(month, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  /*
  |--------------------------------------------------------------------------
  | MONTH TITLE
  |--------------------------------------------------------------------------
  */

  const formattedMonthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <section className="relative mx-auto w-full max-w-5xl px-4 py-5 text-slate-900">
      {/* Ambient background */}

      <div className="pointer-events-none absolute left-1/4 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />

      <div className="pointer-events-none absolute right-1/4 top-1/3 h-48 w-48 rounded-full bg-purple-500/10 blur-[100px]" />

      {/* Main card */}

      <div className="relative z-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
        {/* Accent */}

        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-indigo-500 to-transparent" />

        {/* Header */}

        <div className="relative flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600">
              <CalendarIcon size={15} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 md:text-lg">
                {formattedMonthYear}
              </h2>

              <p className="text-[10px] font-medium text-slate-500">Academic calendar</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              Today
            </button>

            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={retryFetchHolidays}
              disabled={isLoading}
              aria-label="Refresh calendar"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs font-medium text-red-700">Unable to load holidays.</p>

            <button
              type="button"
              onClick={retryFetchHolidays}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Calendar */}

        <div className="p-4">
          {/* Week headers */}

          <div className="grid grid-cols-7 gap-1 border-b border-slate-200 pb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[9px] font-black uppercase tracking-[0.15em] text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}

          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayHolidays = getHolidaysForDay(day)
              const dayEvents = getEventsForDay(day)

              const hasHoliday = dayHolidays.length > 0
              const hasEvent = dayEvents.length > 0
              const currentMonthDay = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const sunday = day.getDay() === 0

              return (
                <div
                  key={day.toISOString()}
                  className={`group/day relative min-h-12 rounded-xl border border-transparent p-1 transition-all duration-200 sm:min-h-14 ${
                    !currentMonthDay
                      ? 'opacity-30'
                      : 'hover:border-indigo-100 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className="flex justify-center">
                    <span
                      title={dayHolidays.map((holiday) => holiday.name).join(', ')}
                      className={`relative flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                        today
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : sunday
                            ? 'text-amber-600'
                            : 'text-slate-700 group-hover/day:bg-indigo-100 group-hover/day:text-indigo-700'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {today && (
                    <div className="mt-0.5 flex justify-center">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-indigo-500" />
                    </div>
                  )}

                  {(hasHoliday || hasEvent) && (
                    <div className="mt-1 flex justify-center gap-1">
                      {hasHoliday && (
                        <span
                          title={dayHolidays.map((holiday) => holiday.name).join(', ')}
                          className="h-1.5 w-1.5 rounded-full bg-amber-500"
                        />
                      )}

                      {hasEvent && (
                        <span
                          title={dayEvents.map((event) => event.title).join(', ')}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />

              <span className="text-[10px] font-medium text-slate-600">Public Holiday</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />

              <span className="text-[10px] font-medium text-slate-600">College Event</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />

              <span className="text-[10px] font-medium text-slate-600">Today</span>
            </div>
          </div>
        </div>

        {/* Upcoming Dates */}

        <div className="border-t border-slate-200/80 bg-slate-50/70 px-4 py-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Upcoming Dates</h3>

              <p className="text-[10px] text-slate-500">
                Holidays and events for {formattedMonthYear}
              </p>
            </div>

            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              {currentMonthHolidays.length + currentMonthEvents.length} Dates
            </span>
          </div>

          {currentMonthHolidays.length === 0 && currentMonthEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-5 text-center">
              <CalendarIcon size={20} className="mx-auto mb-1 text-slate-400" strokeWidth={1.5} />

              <p className="text-[11px] font-medium text-slate-500">
                {isLoading ? 'Loading holidays...' : 'No holidays or events this month.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
              {/* Holidays */}

              {currentMonthHolidays.map((holiday) => {
                const holidayDate = new Date(`${holiday.date}T00:00:00`)

                const month = holidayDate.toLocaleDateString('en-US', {
                  month: 'short',
                })

                const day = holidayDate.getDate()

                const label =
                  holiday.holiday_type === 'national'
                    ? 'National Holiday'
                    : holiday.holiday_type === 'college'
                      ? 'College Holiday'
                      : 'Public Holiday'

                return (
                  <div
                    key={holiday.id}
                    className="group relative rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 transition-all duration-300 hover:border-amber-300 hover:bg-amber-50"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-10 w-8 shrink-0 flex-col overflow-hidden rounded-lg border border-amber-200 bg-white">
                        <div className="h-2 bg-amber-500" />

                        <div className="flex flex-1 flex-col items-center justify-center">
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">
                            {month}
                          </span>

                          <span className="text-xs font-black leading-none text-slate-900">
                            {day}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-amber-500" />

                          <span className="text-[8px] font-bold uppercase tracking-widest text-amber-700">
                            {label}
                          </span>
                        </div>

                        <h4 className="mt-0.5 truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-amber-700">
                          {holiday.name}
                        </h4>

                        {holiday.description && (
                          <p className="mt-0.5 truncate text-[9px] text-slate-500">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Events */}

              {currentMonthEvents.map((event) => {
                const eventDate = new Date(`${event.date}T00:00:00`)

                const month = eventDate.toLocaleDateString('en-US', {
                  month: 'short',
                })

                const day = eventDate.getDate()

                return (
                  <div
                    key={event.id}
                    className="group relative rounded-xl border border-indigo-200 bg-white p-2.5 shadow-sm transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-10 w-8 shrink-0 flex-col overflow-hidden rounded-lg border border-indigo-200 bg-white">
                        <div className="h-2 bg-indigo-600" />

                        <div className="flex flex-1 flex-col items-center justify-center">
                          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">
                            {month}
                          </span>

                          <span className="text-xs font-black leading-none text-slate-900">
                            {day}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-indigo-500" />

                          <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-700">
                            College Event
                          </span>
                        </div>

                        <h4 className="mt-0.5 truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-indigo-700">
                          {event.title}
                        </h4>

                        {event.location && (
                          <div className="mt-1 flex w-fit items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                            <MapPin size={10} strokeWidth={1.8} className="text-indigo-600" />

                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default PublicCalendar
