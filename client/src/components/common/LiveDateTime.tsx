import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'

function LiveDateTime() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const mountTimeout = window.setTimeout(() => {
      setMounted(true)
    }, 50)

    const interval = window.setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)

    return () => {
      window.clearTimeout(mountTimeout)
      window.clearInterval(interval)
    }
  }, [])

  const time = currentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const date = currentDate
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase()

  return (
    <div
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border border-red-500/20 bg-white/2.5 px-4 py-2.5 shadow-[0_0_25px_-10px_rgba(239,68,68,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-red-400/40 hover:bg-white/5 hover:shadow-[0_0_30px_-8px_rgba(239,68,68,0.45)] ${
        mounted ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
      style={{
        transitionProperty: 'transform, opacity, box-shadow, background-color, border-color',
      }}
      aria-label={`Current time ${time}`}
    >
      {/* Ambient Glow */}
      <span className="pointer-events-none absolute -left-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-red-500/10 blur-2xl" />

      {/* Scan Line */}
      <span className="console-scanline pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-transparent via-red-400/10 to-transparent" />

      {/* Clock Icon */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-400 transition-all duration-300 group-hover:border-red-400/40 group-hover:bg-red-500/15">
        <span className="absolute inset-0 animate-pulse rounded-xl border border-red-400/10" />

        <Clock3
          size={17}
          strokeWidth={1.8}
          className="relative transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
          aria-hidden="true"
        />
      </div>

      {/* Date & Time */}
      <div className="relative min-w-36.25 leading-tight">
        <p className="font-mono text-[15px] font-bold tracking-wide text-white tabular-nums">
          {time}
        </p>

        <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-red-400/70 transition-colors duration-300 group-hover:text-red-300/80">
          {date}
        </p>
      </div>
    </div>
  )
}

export default LiveDateTime
