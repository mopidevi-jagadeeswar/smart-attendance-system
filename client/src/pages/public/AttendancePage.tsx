import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Clock3,
  CreditCard,
  ScanFace,
  ShieldCheck,
  UserRound,
  Wifi,
} from 'lucide-react'

import PublicNavbar from '../../components/navigation/PublicNavbar'

const API_BASE_URL = 'http://localhost:8000'

type PersonType = 'student' | 'faculty'
type AttendanceMethod = 'Face' | 'NFC'

interface AttendancePerson {
  personType: PersonType
  name: string
  personId: string
  department: string
  year?: string
  designation?: string
  image: string
  attendanceTime: string
  attendanceMethod: AttendanceMethod
  alreadyMarked: boolean
}

interface AttendanceRecord {
  id: string
  time: string
  personId: string
  name: string
  personType: PersonType
  method: AttendanceMethod
  status: 'Present'
}

type ApiObject = Record<string, unknown>

function AttendancePage() {
  // ============================================================
  // REFS
  // ============================================================

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const recognizingRef = useRef(false)
  const lastErrorSoundRef = useRef(0)

  // ============================================================
  // STATE
  // ============================================================

  const [cameraActive, setCameraActive] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const [validated, setValidated] = useState(false)

  const [person, setPerson] = useState<AttendancePerson | null>(null)

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([])

  const [loadingLogs, setLoadingLogs] = useState(true)

  const [cooldown, setCooldown] = useState(0)

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = useCallback((value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) {
      return '—'
    }

    const rawValue = value.trim()
    const parsed = new Date(rawValue)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    }

    return rawValue
  }, [])

  // ============================================================
  // IMAGE URL
  // ============================================================

  const getImageUrl = useCallback((value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) {
      return ''
    }

    const image = value.trim()

    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
      return image
    }

    return `${API_BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`
  }, [])

  // ============================================================
  // SUCCESS SOUND
  // ============================================================

  const playSuccessSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextClass) {
        return
      }

      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'

      oscillator.frequency.setValueAtTime(520, context.currentTime)

      oscillator.frequency.setValueAtTime(780, context.currentTime + 0.1)

      gain.gain.setValueAtTime(0.15, context.currentTime)

      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35)

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.35)
    } catch {
      // Audio is optional.
    }
  }, [])

  // ============================================================
  // ERROR SOUND
  // ============================================================

  const playErrorSound = useCallback(() => {
    const now = performance.now()

    if (now - lastErrorSoundRef.current < 3000) {
      return
    }

    lastErrorSoundRef.current = now

    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextClass) {
        return
      }

      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sawtooth'

      oscillator.frequency.setValueAtTime(180, context.currentTime)

      oscillator.frequency.setValueAtTime(130, context.currentTime + 0.12)

      gain.gain.setValueAtTime(0.12, context.currentTime)

      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3)

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.3)
    } catch {
      // Audio is optional.
    }
  }, [])

  // ============================================================
  // CLEAR PROFILE
  // ============================================================

  const clearProfile = useCallback(() => {
    setValidated(false)
    setPerson(null)
  }, [])

  // ============================================================
  // ADD LOG
  // ============================================================

  const addAttendanceLog = useCallback((data: AttendanceRecord) => {
    setAttendanceLogs((previous) => [data, ...previous])
  }, [])

  // ============================================================
  // NORMALIZE LOG
  // ============================================================

  const normalizeAttendanceLog = useCallback(
    (value: ApiObject): AttendanceRecord | null => {
      const id = typeof value.id === 'string' ? value.id : ''

      const name = typeof value.name === 'string' ? value.name : ''

      if (!id || !name) {
        return null
      }

      const studentId =
        typeof value.studentId === 'string'
          ? value.studentId
          : typeof value.student_id === 'string'
            ? value.student_id
            : ''

      const facultyId =
        typeof value.facultyId === 'string'
          ? value.facultyId
          : typeof value.faculty_id === 'string'
            ? value.faculty_id
            : ''

      const explicitType =
        typeof value.personType === 'string'
          ? value.personType
          : typeof value.person_type === 'string'
            ? value.person_type
            : ''

      const personType: PersonType =
        explicitType === 'faculty' || facultyId.length > 0 ? 'faculty' : 'student'

      const personId = personType === 'faculty' ? facultyId : studentId

      if (!personId) {
        return null
      }

      const methodValue = typeof value.method === 'string' ? value.method.toLowerCase() : ''

      const method: AttendanceMethod = methodValue === 'nfc' ? 'NFC' : 'Face'

      return {
        id,
        time: formatTime(value.time),
        personId,
        name,
        personType,
        method,
        status: 'Present',
      }
    },
    [formatTime]
  )

  // ============================================================
  // FETCH ATTENDANCE LOGS
  // ============================================================

  useEffect(() => {
    let cancelled = false

    const loadLogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/attendance/logs`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: unknown = await response.json()

        if (cancelled || !Array.isArray(data)) {
          return
        }

        const records = data
          .filter((item): item is ApiObject => typeof item === 'object' && item !== null)
          .map(normalizeAttendanceLog)
          .filter((item): item is AttendanceRecord => item !== null)

        setAttendanceLogs(records)
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load attendance logs:', error)
        }
      } finally {
        if (!cancelled) {
          setLoadingLogs(false)
        }
      }
    }

    void loadLogs()

    return () => {
      cancelled = true
    }
  }, [normalizeAttendanceLog])

  // ============================================================
  // CAMERA
  // ============================================================

  useEffect(() => {
    let mounted = true

    const videoElement = videoRef.current

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not available.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user',
          },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoElement) {
          videoElement.srcObject = stream

          await videoElement.play().catch(() => undefined)
        }

        setCameraActive(true)
      } catch (error) {
        console.error('Camera access failed:', error)

        if (mounted) {
          setCameraActive(false)
        }
      }
    }

    void startCamera()

    return () => {
      mounted = false

      const stream = streamRef.current

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())

        streamRef.current = null
      }

      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [])

  // ============================================================
  // COOLDOWN TIMER
  // ============================================================

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [cooldown])

  // ============================================================
  // FACE RECOGNITION
  // ============================================================

  useEffect(() => {
    if (!cameraActive) {
      return
    }

    let cancelled = false

    const recognizeFace = async () => {
      if (cancelled || cooldown > 0 || recognizingRef.current) {
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas) {
        return
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return
      }

      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      })

      if (!blob || cancelled) {
        return
      }

      recognizingRef.current = true
      setRecognizing(true)

      try {
        const formData = new FormData()

        formData.append('file', blob, 'attendance.jpg')

        const response = await fetch(`${API_BASE_URL}/api/v1/face/recognize`, {
          method: 'POST',
          body: formData,
        })

        let data: ApiObject = {}

        try {
          const json: unknown = await response.json()

          if (typeof json === 'object' && json !== null) {
            data = json as ApiObject
          }
        } catch {
          data = {}
        }

        if (cancelled || !response.ok) {
          return
        }

        if (data.recognized !== true) {
          clearProfile()
          return
        }

        const personType: PersonType = data.person_type === 'faculty' ? 'faculty' : 'student'

        const name = typeof data.name === 'string' ? data.name : ''

        const department = typeof data.department === 'string' ? data.department : ''

        const personId =
          personType === 'faculty'
            ? typeof data.faculty_id === 'string'
              ? data.faculty_id
              : ''
            : typeof data.student_id === 'string'
              ? data.student_id
              : ''

        if (!name || !department || !personId) {
          clearProfile()
          return
        }

        const year = typeof data.year === 'string' ? data.year : undefined

        const designation = typeof data.designation === 'string' ? data.designation : undefined

        const image = getImageUrl(data.image_url)

        const attendanceTime = formatTime(data.time)

        const alreadyMarked = data.already_marked === true

        setPerson({
          personType,
          name,
          personId,
          department,
          year,
          designation,
          image,
          attendanceTime,
          attendanceMethod: 'Face',
          alreadyMarked,
        })

        setValidated(true)

        playSuccessSound()

        if (!alreadyMarked) {
          const recordId = typeof data.id === 'string' ? data.id : `${personId}-${attendanceTime}`

          addAttendanceLog({
            id: recordId,
            time: attendanceTime,
            personId,
            name,
            personType,
            method: 'Face',
            status: 'Present',
          })
        }

        setCooldown(10)
      } catch (error) {
        if (!cancelled) {
          console.error('Face recognition failed:', error)
        }
      } finally {
        recognizingRef.current = false

        if (!cancelled) {
          setRecognizing(false)
        }
      }
    }

    const interval = window.setInterval(() => {
      void recognizeFace()
    }, 3000)

    void recognizeFace()

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [
    addAttendanceLog,
    cameraActive,
    clearProfile,
    cooldown,
    formatTime,
    getImageUrl,
    playSuccessSound,
  ])

  // ============================================================
  // NFC
  // ============================================================

  const handleNfcScan = useCallback(async () => {
    if (nfcScanning || cooldown > 0) {
      return
    }

    setNfcScanning(true)
    clearProfile()

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/attendance/verify-nfc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: 'NFC_SCAN',
        }),
      })

      let data: ApiObject = {}

      try {
        const json: unknown = await response.json()

        if (typeof json === 'object' && json !== null) {
          data = json as ApiObject
        }
      } catch {
        data = {}
      }

      if (!response.ok || typeof data.student_id !== 'string') {
        playErrorSound()
        return
      }

      const studentId = data.student_id

      const name = typeof data.name === 'string' ? data.name : ''

      const department = typeof data.department === 'string' ? data.department : ''

      if (!name || !department) {
        return
      }

      const year = typeof data.year === 'string' ? data.year : undefined

      const image = getImageUrl(data.image_url)

      const attendanceTime = formatTime(data.time)

      const alreadyMarked = data.already_marked === true

      setPerson({
        personType: 'student',
        name,
        personId: studentId,
        department,
        year,
        image,
        attendanceTime,
        attendanceMethod: 'NFC',
        alreadyMarked,
      })

      setValidated(true)

      playSuccessSound()

      if (!alreadyMarked) {
        const recordId = typeof data.id === 'string' ? data.id : `${studentId}-${attendanceTime}`

        addAttendanceLog({
          id: recordId,
          time: attendanceTime,
          personId: studentId,
          name,
          personType: 'student',
          method: 'NFC',
          status: 'Present',
        })
      }

      setCooldown(10)
    } catch (error) {
      console.error('NFC verification failed:', error)
    } finally {
      setNfcScanning(false)
    }
  }, [
    addAttendanceLog,
    clearProfile,
    cooldown,
    formatTime,
    getImageUrl,
    nfcScanning,
    playErrorSound,
    playSuccessSound,
  ])

  // ============================================================
  // RECENT LOGS
  // ============================================================

  const recentLogs = attendanceLogs.slice(0, 5)

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
                Live Attendance
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold text-white">Attendance</h1>

            <p className="mt-1 text-xs text-slate-500">
              Verify attendance using face recognition or NFC.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-[10px] font-medium text-emerald-400">System Online</span>
          </div>
        </div>

        {/* MAIN GRID */}

        <div className="grid gap-5 lg:grid-cols-2">
          {/* CAMERA */}

          <section className="rounded-2xl border border-white/10 bg-white/3 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <Camera size={17} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">Live Camera</h2>

                  <p className="text-[10px] text-slate-500">Automatic face recognition</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-400">
                  <span
                    className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                      cameraActive ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />

                  {cameraActive ? 'Active' : 'Offline'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    void handleNfcScan()
                  }}
                  disabled={nfcScanning || cooldown > 0}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-semibold text-blue-300 transition hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wifi size={13} />

                  {nfcScanning ? 'Scanning...' : 'NFC'}
                </button>
              </div>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                  <Camera size={32} className="text-slate-600" />

                  <p className="mt-3 text-xs text-slate-500">Camera unavailable</p>

                  <p className="mt-1 text-[10px] text-slate-700">Allow camera access</p>
                </div>
              )}

              {cameraActive && (
                <>
                  <div className="absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-red-400" />

                  <div className="absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-red-400" />

                  <div className="absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-red-400" />

                  <div className="absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-red-400" />
                </>
              )}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] text-slate-300">
                  <span
                    className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${
                      recognizing
                        ? 'bg-blue-400'
                        : cooldown > 0
                          ? 'bg-yellow-400'
                          : 'bg-emerald-400'
                    }`}
                  />

                  {cooldown > 0
                    ? `Next scan in ${cooldown}s`
                    : recognizing
                      ? 'Analyzing face...'
                      : 'Scanner ready'}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <ScanFace size={12} className="text-red-400" />
                Face recognition enabled
              </span>

              <span>Automatic scan</span>
            </div>
          </section>

          {/* VERIFIED PROFILE */}

          <section className="rounded-2xl border border-white/10 bg-white/3 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  {validated ? <ShieldCheck size={17} /> : <UserRound size={17} />}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {person?.personType === 'faculty' ? 'Validated Faculty' : 'Validated Student'}
                  </h2>

                  <p className="text-[10px] text-slate-500">
                    {validated ? 'Identity verified successfully' : 'Waiting for verification'}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${
                  validated
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-white/3 text-slate-500'
                }`}
              >
                {validated ? 'Verified' : 'Waiting'}
              </span>
            </div>

            {validated && person ? (
              <div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-emerald-400/30 bg-slate-900">
                      {person.image ? (
                        <img
                          src={person.image}
                          alt={person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <UserRound size={32} className="text-slate-600" />
                        </div>
                      )}

                      <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                        <CheckCircle2 size={13} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                        Identity Verified
                      </span>

                      <h3 className="mt-1 truncate text-xl font-bold text-white">{person.name}</h3>

                      <p className="mt-1 font-mono text-xs text-emerald-400">{person.personId}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[9px] text-slate-400">
                          {person.personType === 'faculty'
                            ? (person.designation ?? 'Faculty')
                            : (person.year ?? 'Student')}
                        </span>

                        <span className="max-w-40 truncate rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1.5 text-[9px] text-emerald-300">
                          {person.department}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/4 p-3">
                    <p className="text-[8px] uppercase tracking-wider text-slate-600">Person ID</p>

                    <p className="mt-1 truncate font-mono text-[11px] text-slate-300">
                      {person.personId}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/4 p-3">
                    <p className="text-[8px] uppercase tracking-wider text-slate-600">Method</p>

                    <p className="mt-1 text-[11px] text-slate-300">
                      {person.attendanceMethod === 'NFC' ? 'NFC' : 'Face Recognition'}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-3 rounded-2xl border p-4 ${
                    person.alreadyMarked
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-emerald-500/20 bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        size={24}
                        className={person.alreadyMarked ? 'text-amber-400' : 'text-emerald-400'}
                      />

                      <div>
                        <p
                          className={`text-xs font-bold ${
                            person.alreadyMarked ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {person.alreadyMarked ? 'Already Marked' : 'Attendance Marked'}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">{person.attendanceTime}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-[10px] font-bold ${
                          person.alreadyMarked ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        PRESENT
                      </p>

                      <p className="mt-1 text-[9px] text-slate-600">{person.attendanceMethod}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/3">
                  <ScanFace size={38} className="text-slate-600" strokeWidth={1.3} />
                </div>

                <h3 className="mt-6 text-sm font-semibold text-slate-300">
                  Ready for verification
                </h3>

                <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-slate-600">
                  Position a student or faculty face inside the camera frame.
                </p>

                <div className="mt-5 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-[9px] text-slate-500">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Scanner ready
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RECENT ATTENDANCE */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/4 text-slate-400">
                <Clock3 size={17} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white">Recent Attendance</h2>

                <p className="text-[10px] text-slate-500">Latest attendance records</p>
              </div>
            </div>

            <span className="text-[10px] text-slate-600">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-175">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Time
                  </th>

                  <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    ID
                  </th>

                  <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Person
                  </th>

                  <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Type
                  </th>

                  <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Method
                  </th>

                  <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loadingLogs && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-600">
                      Loading attendance...
                    </td>
                  </tr>
                )}

                {!loadingLogs && recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-600">
                      No attendance records yet.
                    </td>
                  </tr>
                )}

                {!loadingLogs &&
                  recentLogs.map((record) => (
                    <tr key={record.id} className="transition hover:bg-white/3">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock3 size={12} className="text-slate-600" />

                          {record.time}
                        </div>
                      </td>

                      <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                        {record.personId}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[9px] font-semibold text-slate-400">
                            {record.name
                              .split(' ')
                              .map((part) => part[0] ?? '')
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>

                          <span className="text-xs font-semibold text-slate-300">
                            {record.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`rounded-lg border px-2.5 py-1 text-[9px] ${
                            record.personType === 'faculty'
                              ? 'border-blue-400/20 bg-blue-400/10 text-blue-300'
                              : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                          }`}
                        >
                          {record.personType === 'faculty' ? 'Faculty' : 'Student'}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/3 px-2.5 py-1 text-[9px] text-slate-400">
                          {record.method === 'Face' ? (
                            <ScanFace size={11} className="text-red-400" />
                          ) : (
                            <CreditCard size={11} className="text-blue-400" />
                          )}

                          {record.method}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-400">
                          <CheckCircle2 size={10} />
                          Present
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default AttendancePage
