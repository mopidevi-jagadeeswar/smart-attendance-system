import {
  Camera,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const REQUIRED_PHOTOS = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type CapturedPhoto = {
  id: string
  file: File
  preview: string
}

type FormState = {
  faculty_id: string
  full_name: string
  email: string
  password: string
  phone: string
  department: string
  designation: string
}

const initialForm: FormState = {
  faculty_id: '',
  full_name: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  designation: '',
}

export default function RegisterFaculty() {
  const navigate = useNavigate()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState<FormState>(initialForm)
  const [showPassword, setShowPassword] = useState(false)

  const [photos, setPhotos] = useState<CapturedPhoto[]>([])

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(0)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // ==========================================================
  // FORM HANDLING
  // ==========================================================

  const updateField = (field: keyof FormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  // ==========================================================
  // CAMERA
  // ==========================================================

  const startCamera = async () => {
    setCameraError('')
    setError('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.')
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      setCameraActive(true)
    } catch (err) {
      console.error('Camera error:', err)

      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : err instanceof DOMException && err.name === 'NotReadableError'
              ? 'The camera is already being used by another application.'
              : err instanceof Error
                ? err.message
                : 'Unable to access camera.'

      setCameraError(message)
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const video = videoRef.current

    if (video) {
      video.pause()
      video.srcObject = null
    }

    setCameraActive(false)
  }

  useEffect(() => {
    if (!cameraActive || !streamRef.current) {
      return
    }

    const video = videoRef.current
    const stream = streamRef.current

    if (!video) {
      return
    }

    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    void video.play().catch((err: unknown) => {
      console.error('Unable to start camera preview:', err)

      setCameraError(
        'Camera opened, but the preview could not start. Please try Start Camera again.'
      )

      setCameraActive(false)
    })

    return () => {
      video.pause()
      video.srcObject = null
    }
  }, [cameraActive])

  // ==========================================================
  // CAPTURE PHOTO
  // ==========================================================

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    if (photos.length >= REQUIRED_PHOTOS) {
      setError(`You already captured ${REQUIRED_PHOTOS} photos.`)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError('Camera is not ready yet.')
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      setError('Unable to capture the camera frame.')
      return
    }

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      setError('Unable to capture camera frame.')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Unable to create image.')
          return
        }

        const photoNumber = photos.length + 1

        const file = new File([blob], `faculty_photo_${photoNumber}.jpg`, {
          type: 'image/jpeg',
        })

        const newPhoto: CapturedPhoto = {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
        }

        setPhotos((previous) => [...previous, newPhoto])
        setSelectedPhoto(photoNumber - 1)
        setError('')
      },
      'image/jpeg',
      0.92
    )
  }

  // ==========================================================
  // UPLOAD PHOTOS
  // ==========================================================

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (!files.length) {
      return
    }

    const remaining = REQUIRED_PHOTOS - photos.length

    if (files.length > remaining) {
      setError(`You can upload only ${remaining} more photo${remaining === 1 ? '' : 's'}.`)
    }

    const filesToUse = files.slice(0, remaining)

    const validPhotos: CapturedPhoto[] = []

    for (const file of filesToUse) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed.')
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError('Each image must be smaller than 5 MB.')
        continue
      }

      validPhotos.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })
    }

    if (validPhotos.length) {
      setPhotos((previous) => [...previous, ...validPhotos])
      setError('')
    }

    event.target.value = ''
  }

  // ==========================================================
  // REMOVE PHOTO
  // ==========================================================

  const removePhoto = (index: number) => {
    setPhotos((previous) => {
      const photo = previous[index]

      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }

      const updated = previous.filter((_, photoIndex) => photoIndex !== index)

      return updated
    })

    setSelectedPhoto((previous) => {
      if (previous > index) {
        return previous - 1
      }

      if (previous >= photos.length - 1) {
        return Math.max(0, photos.length - 2)
      }

      return previous
    })

    setError('')
  }

  // ==========================================================
  // CLEAR PHOTOS
  // ==========================================================

  const clearPhotos = () => {
    photos.forEach((photo) => {
      URL.revokeObjectURL(photo.preview)
    })

    setPhotos([])
    setSelectedPhoto(0)
    setError('')
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!form.faculty_id.trim()) {
      setError('Faculty ID is required.')
      return
    }

    if (!form.full_name.trim()) {
      setError('Full name is required.')
      return
    }

    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (!form.department.trim()) {
      setError('Department is required.')
      return
    }

    if (!form.designation.trim()) {
      setError('Designation is required.')
      return
    }

    if (photos.length !== REQUIRED_PHOTOS) {
      setError(`Exactly ${REQUIRED_PHOTOS} face photos are required.`)
      return
    }

    setLoading(true)

    try {
      const payload = new FormData()

      payload.append('faculty_id', form.faculty_id.trim())
      payload.append('full_name', form.full_name.trim())
      payload.append('email', form.email.trim().toLowerCase())
      payload.append('password', form.password)
      payload.append('phone', form.phone.trim())
      payload.append('department', form.department.trim())
      payload.append('designation', form.designation.trim())

      photos.forEach((photo) => {
        payload.append('face_images', photo.file, photo.file.name)
      })

      const token = localStorage.getItem('access_token') || localStorage.getItem('token')

      const response = await fetch(`${API_BASE_URL}/faculty/register`, {
        method: 'POST',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: payload,
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
            : `Faculty registration failed (${response.status}).`

        throw new Error(detail)
      }

      console.log('Faculty registration successful:', responseData)

      setSuccess('Faculty registered successfully with 5 face embeddings.')

      stopCamera()

      setTimeout(() => {
        navigate('/admin/faculty')
      }, 1200)
    } catch (err) {
      console.error('Faculty registration error:', err)

      setError(err instanceof Error ? err.message : 'Faculty registration failed.')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    const video = videoRef.current

    return () => {
      const stream = streamRef.current

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (video) {
        video.pause()
        video.srcObject = null
      }
    }
  }, [])

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const selectedPreview = photos[selectedPhoto]?.preview
  const photoProgress = `${photos.length}/${REQUIRED_PHOTOS}`

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-slate-50 p-4 text-slate-900 sm:p-5 lg:p-6">
      {/* Background glass decorations */}

      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-white/70 text-indigo-600 shadow-sm backdrop-blur-xl">
              <UserPlus size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Register Faculty
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Create a faculty account and enroll five face images for attendance verification.
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur-xl">
            <Check size={18} />
            {success}
          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-700 shadow-sm backdrop-blur-xl">
            <X size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          {/* =================================================
              LEFT — FACULTY DETAILS
          ================================================= */}

          <section className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] backdrop-blur-2xl sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <UserPlus size={17} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">Faculty Information</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the faculty member&apos;s account and professional details.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Faculty ID */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Faculty ID
                </label>

                <input
                  type="text"
                  value={form.faculty_id}
                  onChange={(event) => updateField('faculty_id', event.target.value)}
                  placeholder="e.g. FAC001"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Full name */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>

                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => updateField('full_name', event.target.value)}
                  placeholder="Enter full name"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Email */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="faculty@example.com"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Password */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={loading}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((previous) => !previous)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.8} />
                    ) : (
                      <Eye size={18} strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Phone */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Enter phone number"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Department */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Department
                </label>

                <input
                  type="text"
                  value={form.department}
                  onChange={(event) => updateField('department', event.target.value)}
                  placeholder="e.g. Computer Science"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Designation */}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Designation
                </label>

                <input
                  type="text"
                  value={form.designation}
                  onChange={(event) => updateField('designation', event.target.value)}
                  placeholder="e.g. Assistant Professor"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              RIGHT — FACE ENROLLMENT
          ================================================= */}

          <section className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Camera size={17} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Face Enrollment</h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Capture exactly five clear face images.
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                {photoProgress}
              </div>
            </div>

            {/* =================================================
                CAMERA
            ================================================= */}

            <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : selectedPreview ? (
                <img
                  src={selectedPreview}
                  alt="Selected faculty face"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center text-slate-500">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    <Camera size={28} className="text-indigo-500" />
                  </div>

                  <p className="font-medium text-slate-700">Camera is ready for enrollment</p>

                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    Position the face clearly inside the camera frame.
                  </p>
                </div>
              )}

              {cameraActive && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-[62%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]" />

                  <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                    Camera active
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Camera error */}

            {cameraError && <p className="mt-3 text-sm text-red-600">{cameraError}</p>}

            {/* =================================================
                CAMERA CONTROLS
            ================================================= */}

            <div className="mt-4 flex flex-wrap gap-3">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={loading || photos.length >= REQUIRED_PHOTOS}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera size={17} />
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={loading || photos.length >= REQUIRED_PHOTOS}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera size={17} />
                    Capture Photo
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:opacity-50"
                  >
                    Stop Camera
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || photos.length >= REQUIRED_PHOTOS}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={17} />
                Upload
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* =================================================
                PHOTO STRIP
            ================================================= */}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enrollment Photos</p>

                  <p className="text-xs text-slate-500">
                    {photos.length} of {REQUIRED_PHOTOS} captured
                  </p>
                </div>

                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPhotos}
                    disabled={loading}
                    className="text-xs font-semibold text-red-500 transition hover:text-red-600 hover:underline disabled:opacity-50"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {Array.from({
                  length: REQUIRED_PHOTOS,
                }).map((_, index) => {
                  const photo = photos[index]

                  return (
                    <div
                      key={index}
                      className={`relative aspect-square overflow-hidden rounded-xl border bg-white/60 ${
                        selectedPhoto === index
                          ? 'border-indigo-400 ring-2 ring-indigo-100'
                          : 'border-slate-200'
                      }`}
                    >
                      {photo ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(index)}
                            className="absolute inset-0 z-10"
                            aria-label={`Select photo ${index + 1}`}
                          >
                            <img
                              src={photo.preview}
                              alt={`Enrollment photo ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            disabled={loading}
                            className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-red-500 disabled:opacity-50"
                            aria-label={`Remove photo ${index + 1}`}
                          >
                            <X size={13} />
                          </button>

                          <div className="pointer-events-none absolute bottom-1 left-1 z-20 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {index + 1}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center bg-slate-50 text-slate-300">
                          <Camera size={16} />
                          <span className="mt-1 text-[10px]">{index + 1}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* =================================================
                PHOTO NAVIGATION
            ================================================= */}

            {photos.length > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto((previous) => Math.max(0, previous - 1))}
                  disabled={selectedPhoto === 0 || loading}
                  className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-600 disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="text-xs font-medium text-slate-500">
                  Photo {selectedPhoto + 1} of {photos.length}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPhoto((previous) => Math.min(photos.length - 1, previous + 1))
                  }
                  disabled={selectedPhoto >= photos.length - 1 || loading}
                  className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-600 disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            {/* =================================================
                AI INFORMATION
            ================================================= */}

            <div className="mt-6 rounded-xl border border-indigo-100 bg-linear-to-r from-indigo-50/80 via-white/60 to-violet-50/80 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm ring-1 ring-slate-100">
                  <Check size={16} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">AI Face Enrollment</p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Each photo is processed by the backend using RetinaFace and ArcFace. Five
                    512-dimensional face embeddings are stored for attendance verification.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              FOOTER ACTIONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end xl:col-span-2">
            <button
              type="button"
              onClick={() => navigate('/admin/faculty')}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || photos.length !== REQUIRED_PHOTOS}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Processing Face Data...
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  Register Faculty
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
