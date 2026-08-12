import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// ============================================================
// TYPES
// ============================================================

interface FormData {
  student_id: string
  full_name: string
  email: string
  password: string
  confirm_password: string
  phone: string
  date_of_birth: string
  gender: string
  department: string
  course: string
  year: string
  semester: string
  section: string

  // AI face enrollment
  face_images: File[]
  face_previews: string[]
}

// ============================================================
// INITIAL FORM
// ============================================================

const initialFormData: FormData = {
  student_id: '',
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  department: '',
  course: '',
  year: '',
  semester: '',
  section: '',

  face_images: [],
  face_previews: [],
}

// ============================================================
// STEPS
// ============================================================

const steps = [
  {
    number: 1,
    title: 'Personal',
    description: 'Basic information',
  },
  {
    number: 2,
    title: 'Academic',
    description: 'Student details',
  },
  {
    number: 3,
    title: 'Face',
    description: 'AI enrollment',
  },
  {
    number: 4,
    title: 'Review',
    description: 'Confirm details',
  },
]

const TOTAL_STEPS = steps.length

const REQUIRED_FACE_PHOTOS = 5

// ============================================================
// API
// ============================================================

const API_BASE_URL = 'http://localhost:8000'

const STUDENT_REGISTER_URL = `${API_BASE_URL}/students/register`

// ============================================================
// COMPONENT
// ============================================================

export default function RegisterStudent() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState<FormData>(initialFormData)

  const [error, setError] = useState('')

  const [successMessage, setSuccessMessage] = useState('')

  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [stepVisible, setStepVisible] = useState(true)

  // ==========================================================
  // CAMERA
  // ==========================================================

  const videoRef = useRef<HTMLVideoElement>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cameraStreamRef = useRef<MediaStream | null>(null)

  const [isCameraActive, setIsCameraActive] = useState(false)

  const [cameraError, setCameraError] = useState('')

  // ==========================================================
  // INPUT HANDLER
  // ==========================================================

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
    setSuccessMessage('')
  }

  // ==========================================================
  // START CAMERA
  // ==========================================================

  const startCamera = async () => {
    setCameraError('')
    setError('')

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.')
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())

        cameraStreamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      })

      cameraStreamRef.current = stream

      setIsCameraActive(true)
    } catch (cameraAccessError) {
      console.error('Camera access error:', cameraAccessError)

      if (cameraAccessError instanceof DOMException) {
        switch (cameraAccessError.name) {
          case 'NotAllowedError':
            setCameraError(
              'Camera permission was denied. Please allow camera access for this site.'
            )
            break

          case 'NotFoundError':
            setCameraError('No camera was found on this device.')
            break

          case 'NotReadableError':
            setCameraError('The camera is currently being used by another application.')
            break

          case 'SecurityError':
            setCameraError('Camera access is blocked by browser security settings.')
            break

          case 'AbortError':
            setCameraError('Camera access was interrupted. Please try again.')
            break

          default:
            setCameraError(`Unable to access the camera (${cameraAccessError.name}).`)
        }
      } else if (cameraAccessError instanceof Error) {
        setCameraError(cameraAccessError.message)
      } else {
        setCameraError('Unable to access the camera. Please try again.')
      }

      setIsCameraActive(false)
    }
  }

  // ==========================================================
  // ATTACH CAMERA STREAM
  // ==========================================================

  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !cameraStreamRef.current) {
      return
    }

    const video = videoRef.current

    const stream = cameraStreamRef.current

    video.srcObject = stream

    video.play().catch((playError) => {
      console.error('Unable to start camera preview:', playError)

      setCameraError('Unable to start the camera preview. Please try again.')
    })
  }, [isCameraActive])

  // ==========================================================
  // STOP CAMERA
  // ==========================================================

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())

      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraActive(false)
  }

  // ==========================================================
  // CAPTURE FACE PHOTO
  // ==========================================================

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera preview is not ready. Please start the camera again.')

      return
    }

    const video = videoRef.current

    const canvas = canvasRef.current

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera video is not ready yet. Please wait a moment and try again.')

      return
    }

    if (formData.face_images.length >= REQUIRED_FACE_PHOTOS) {
      setError('All 5 face photos have already been captured.')

      return
    }

    canvas.width = video.videoWidth

    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setError('Unable to capture the camera image.')

      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Unable to create the face image.')

          return
        }

        const photoNumber = formData.face_images.length + 1

        const file = new File([blob], `student-face-${photoNumber}.jpg`, {
          type: 'image/jpeg',
        })

        const previewUrl = URL.createObjectURL(blob)

        setFormData((previous) => ({
          ...previous,

          face_images: [...previous.face_images, file],

          face_previews: [...previous.face_previews, previewUrl],
        }))

        setError('')
        setCameraError('')

        if (photoNumber === REQUIRED_FACE_PHOTOS) {
          stopCamera()
        }
      },
      'image/jpeg',
      0.9
    )
  }

  // ==========================================================
  // REMOVE FACE PHOTO
  // ==========================================================

  const removeFacePhoto = (index: number) => {
    const preview = formData.face_previews[index]

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setFormData((previous) => ({
      ...previous,

      face_images: previous.face_images.filter((_, photoIndex) => photoIndex !== index),

      face_previews: previous.face_previews.filter((_, photoIndex) => photoIndex !== index),
    }))

    setError('')
    setCameraError('')
  }

  // ==========================================================
  // RETAKE LAST PHOTO
  // ==========================================================

  const retakeLastPhoto = () => {
    if (formData.face_images.length === 0) {
      void startCamera()
      return
    }

    const lastIndex = formData.face_images.length - 1

    const preview = formData.face_previews[lastIndex]

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setFormData((previous) => ({
      ...previous,

      face_images: previous.face_images.slice(0, -1),

      face_previews: previous.face_previews.slice(0, -1),
    }))

    setCameraError('')
    setError('')

    void startCamera()
  }

  // ==========================================================
  // COMPONENT CLEANUP
  // ==========================================================

  const facePreviewsRef = useRef<string[]>([])

  useEffect(() => {
    facePreviewsRef.current = formData.face_previews
  }, [formData.face_previews])

  useEffect(() => {
    return () => {
      const stream = cameraStreamRef.current

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }

      facePreviewsRef.current.forEach((preview) => {
        URL.revokeObjectURL(preview)
      })

      facePreviewsRef.current = []
    }
  }, [])

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateStep = (): string | null => {
    if (currentStep === 1) {
      if (!formData.student_id.trim()) {
        return 'Student ID is required.'
      }

      if (!formData.full_name.trim()) {
        return 'Full name is required.'
      }

      if (!formData.email.trim()) {
        return 'Email address is required.'
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailPattern.test(formData.email.trim())) {
        return 'Please enter a valid email address.'
      }

      if (!formData.phone.trim()) {
        return 'Phone number is required.'
      }

      const phoneDigits = formData.phone.replace(/\D/g, '')

      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return 'Please enter a valid phone number.'
      }

      if (!formData.password) {
        return 'Password is required.'
      }

      if (formData.password.length < 8) {
        return 'Password must contain at least 8 characters.'
      }

      if (!formData.confirm_password) {
        return 'Please confirm the password.'
      }

      if (formData.password !== formData.confirm_password) {
        return 'Passwords do not match.'
      }
    }

    if (currentStep === 2) {
      if (!formData.department.trim()) {
        return 'Department is required.'
      }

      if (!formData.course.trim()) {
        return 'Course is required.'
      }

      if (!formData.year) {
        return 'Year is required.'
      }

      if (!formData.semester) {
        return 'Semester is required.'
      }

      if (!formData.section.trim()) {
        return 'Section is required.'
      }

      const year = Number(formData.year)

      const semester = Number(formData.semester)

      if (year < 1) {
        return 'Please select a valid academic year.'
      }

      if (semester < 1) {
        return 'Please select a valid semester.'
      }
    }

    if (currentStep === 3) {
      if (formData.face_images.length !== REQUIRED_FACE_PHOTOS) {
        return `Please capture all ${REQUIRED_FACE_PHOTOS} face photos before continuing.`
      }
    }

    return null
  }

  // ==========================================================
  // NEXT
  // ==========================================================

  const handleNext = () => {
    setError('')
    setSuccessMessage('')

    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    if (currentStep === 3) {
      stopCamera()
    }

    setStepVisible(false)

    window.setTimeout(() => {
      setStepVisible(true)
    }, 20)

    setCurrentStep((previous) => Math.min(previous + 1, TOTAL_STEPS))
  }

  // ==========================================================
  // PREVIOUS
  // ==========================================================

  const handlePrevious = () => {
    setError('')
    setSuccessMessage('')

    if (currentStep === 3) {
      stopCamera()
    }

    setStepVisible(false)

    window.setTimeout(() => {
      setStepVisible(true)
    }, 20)

    setCurrentStep((previous) => Math.max(previous - 1, 1))
  }

  // ==========================================================
  // GET ACCESS TOKEN
  // ==========================================================

  const getAccessToken = () => {
    return localStorage.getItem('access_token') || localStorage.getItem('token')
  }

  // ==========================================================
  // BACKEND ERROR HANDLER
  // ==========================================================

  const getBackendErrorMessage = (submitError: unknown): string => {
    if (!axios.isAxiosError(submitError)) {
      if (submitError instanceof Error && submitError.message) {
        return submitError.message
      }

      return 'Something went wrong. Please try again.'
    }

    const statusCode = submitError.response?.status

    const responseData = submitError.response?.data

    if (statusCode === 400) {
      if (typeof responseData?.detail === 'string') {
        return responseData.detail
      }

      return 'The submitted information is invalid. Please check the form.'
    }

    if (statusCode === 401) {
      return 'Your admin session has expired or is invalid. Please log in again.'
    }

    if (statusCode === 403) {
      return 'You do not have permission to register students. Admin access is required.'
    }

    if (statusCode === 409) {
      if (typeof responseData?.detail === 'string') {
        return responseData.detail
      }

      return 'A student with this Student ID or email already exists.'
    }

    if (statusCode === 413) {
      return 'The uploaded face images are too large. Please capture the photos again.'
    }

    if (statusCode === 422) {
      const details = responseData?.detail

      if (Array.isArray(details)) {
        const messages = details
          .map((item) => {
            if (typeof item?.msg === 'string') {
              const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null

              return field ? `${String(field)}: ${item.msg}` : item.msg
            }

            return null
          })
          .filter((message): message is string => Boolean(message))

        if (messages.length > 0) {
          return messages.join(' ')
        }
      }

      return 'Some required information is missing or invalid. Please check the form.'
    }

    if (statusCode === 500) {
      return 'The server encountered an unexpected error. Please try again.'
    }

    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return 'The attendance server is temporarily unavailable. Please try again shortly.'
    }

    if (submitError.code === 'ERR_NETWORK') {
      return 'Cannot connect to the backend. Make sure the FastAPI server is running on port 8000.'
    }

    if (submitError.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again.'
    }

    if (typeof responseData?.detail === 'string') {
      return responseData.detail
    }

    return 'Unable to register the student. Please try again.'
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loading) {
      return
    }

    setError('')
    setSuccessMessage('')

    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    const accessToken = getAccessToken()

    if (!accessToken) {
      setError('Admin authentication token was not found. Please log in again.')

      return
    }

    setLoading(true)

    try {
      const payload = new window.FormData()

      payload.append('student_id', formData.student_id.trim())

      payload.append('full_name', formData.full_name.trim())

      payload.append('email', formData.email.trim().toLowerCase())

      payload.append('password', formData.password)

      if (formData.phone.trim()) {
        payload.append('phone', formData.phone.trim())
      }

      if (formData.date_of_birth) {
        payload.append('date_of_birth', formData.date_of_birth)
      }

      if (formData.gender) {
        payload.append('gender', formData.gender)
      }

      payload.append('department', formData.department.trim())

      payload.append('course', formData.course.trim())

      payload.append('year', String(Number(formData.year)))

      if (formData.semester) {
        payload.append('semester', String(Number(formData.semester)))
      }

      if (formData.section.trim()) {
        payload.append('section', formData.section.trim())
      }

      formData.face_images.forEach((image) => {
        payload.append('face_images', image)
      })

      const response = await axios.post(STUDENT_REGISTER_URL, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
        timeout: 60000,
      })

      console.log('Student registration successful:', response.data)

      setSuccessMessage('Student registered successfully.')

      stopCamera()

      window.setTimeout(() => {
        navigate('/admin/students')
      }, 1200)
    } catch (submitError) {
      console.error('Student registration failed:', submitError)

      setError(getBackendErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="h-[calc(100vh-72px)] overflow-hidden bg-linear-to-br from-slate-100 via-indigo-50/75 to-sky-100/70 p-3 text-slate-900 sm:p-4 lg:p-5 relative">
      {/* Ambient glowing background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto flex h-full w-full max-w-4xl flex-col relative z-10">
        {/* HEADER */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
              Registration Portal
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Register Student
            </h1>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">
            Create a student account and AI face profile
          </p>
        </div>

        {/* CARD */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-indigo-100/60 bg-white/60 backdrop-blur-2xl shadow-2xl shadow-indigo-500/10">
          {/* STEPPER */}
          <div className="border-b border-indigo-100/60 bg-linear-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 px-5 py-3 sm:px-7">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const completed = currentStep > step.number
                const active = currentStep === step.number

                return (
                  <div key={step.number} className="flex flex-1 items-center">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div
                        className={`
                          flex h-7 w-7 shrink-0
                          items-center justify-center
                          rounded-lg text-[11px]
                          font-bold transition-all
                          ${
                            completed
                              ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20'
                              : active
                                ? 'scale-105 bg-indigo-600 text-white shadow-lg shadow-indigo-500/40'
                                : 'border border-indigo-200/60 bg-white/60 text-slate-500'
                          }
                        `}
                      >
                        {completed ? <Check size={13} /> : step.number}
                      </div>

                      <div className="hidden min-w-0 lg:block">
                        <p
                          className={`
                            truncate text-[11px] font-semibold
                            ${
                              active
                                ? 'text-slate-900'
                                : completed
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                            }
                          `}
                        >
                          {step.title}
                        </p>
                      </div>
                    </div>

                    {index < steps.length - 1 && (
                      <div
                        className={`
                          mx-1.5 h-px flex-1
                          ${completed ? 'bg-emerald-500/50' : 'bg-white/60'}
                        `}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ALERTS */}
          {(error || successMessage) && (
            <div className="px-5 pt-3 sm:px-7">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-300/50 bg-red-100/80 px-4 py-2.5 text-xs text-red-600 backdrop-blur-md">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-300/50 bg-emerald-100/80 px-4 py-2.5 text-xs text-emerald-600 backdrop-blur-md">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div
                className={`
                  transition-all duration-300
                  ${stepVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
                `}
              >
                {/* STEP 1: PERSONAL */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Personal Information
                      </h2>
                      <p className="text-xs text-slate-500">
                        Enter the student's basic details and account credentials
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Student ID <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="student_id"
                          value={formData.student_id}
                          onChange={handleChange}
                          placeholder="e.g. STU1001"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Full Name <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          placeholder="e.g. John Doe"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Address <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="e.g. john@university.edu"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Phone Number <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. +91 9876543210"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-white">
                            Select Gender
                          </option>
                          <option value="Male" className="bg-white">
                            Male
                          </option>
                          <option value="Female" className="bg-white">
                            Female
                          </option>
                          <option value="Other" className="bg-white">
                            Other
                          </option>
                        </select>
                      </div>

                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Password <span className="text-indigo-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="At least 8 characters"
                            className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Confirm Password <span className="text-indigo-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            placeholder="Re-enter password"
                            className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700"
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: ACADEMIC */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Academic Details</h2>
                      <p className="text-xs text-slate-500">
                        Specify department, course, and enrollment parameters
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Department <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          placeholder="e.g. Computer Science"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Course <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="course"
                          value={formData.course}
                          onChange={handleChange}
                          placeholder="e.g. B.Tech MCA"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Year <span className="text-indigo-600">*</span>
                        </label>
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-white">
                            Select Year
                          </option>
                          <option value="1" className="bg-white">
                            1st Year
                          </option>
                          <option value="2" className="bg-white">
                            2nd Year
                          </option>
                          <option value="3" className="bg-white">
                            3rd Year
                          </option>
                          <option value="4" className="bg-white">
                            4th Year
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Semester <span className="text-indigo-600">*</span>
                        </label>
                        <select
                          name="semester"
                          value={formData.semester}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-white">
                            Select Semester
                          </option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <option key={sem} value={sem} className="bg-white">
                              Semester {sem}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Section <span className="text-indigo-600">*</span>
                        </label>
                        <input
                          type="text"
                          name="section"
                          value={formData.section}
                          onChange={handleChange}
                          placeholder="e.g. A or Section 1"
                          className="w-full rounded-xl border border-indigo-200/60 bg-white/60/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white/60 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: FACE ENROLLMENT */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">AI Face Enrollment</h2>
                      <p className="text-xs text-slate-500">
                        Capture {REQUIRED_FACE_PHOTOS} clear photos of the student's face for
                        biometric verification
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Camera Viewport */}
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100/60 bg-white/60 p-4 text-center relative overflow-hidden">
                        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-white border border-indigo-100/60 flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                          />

                          {!isCameraActive && (
                            <div className="flex flex-col items-center justify-center p-6 text-slate-500">
                              <Camera size={36} className="mb-2 text-slate-500 animate-pulse" />
                              <p className="text-xs">Camera is currently inactive</p>
                            </div>
                          )}

                          {/* Hidden canvas for capturing frames */}
                          <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {cameraError && <p className="mt-2 text-xs text-red-500">{cameraError}</p>}

                        <div className="mt-4 flex gap-2">
                          {!isCameraActive ? (
                            <button
                              type="button"
                              onClick={startCamera}
                              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                            >
                              <Camera size={14} /> Start Camera
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={captureImage}
                                disabled={formData.face_images.length >= REQUIRED_FACE_PHOTOS}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                              >
                                <Check size={14} /> Capture Photo ({formData.face_images.length}/
                                {REQUIRED_FACE_PHOTOS})
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="rounded-xl border border-indigo-200/60 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-500/10 transition-all"
                              >
                                Stop
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Thumbnails preview */}
                      <div className="flex flex-col justify-between rounded-2xl border border-indigo-100/60 bg-white/60 p-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                            Captured Photos ({formData.face_images.length}/{REQUIRED_FACE_PHOTOS})
                          </h3>

                          {formData.face_previews.length === 0 ? (
                            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-indigo-100/60 text-xs text-slate-500">
                              No photos captured yet
                            </div>
                          ) : (
                            <div className="grid grid-cols-5 gap-2">
                              {formData.face_previews.map((preview, idx) => (
                                <div
                                  key={idx}
                                  className="relative group aspect-square rounded-lg overflow-hidden border border-indigo-200/60 bg-white"
                                >
                                  <img
                                    src={preview}
                                    alt={`Face ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeFacePhoto(idx)}
                                    className="absolute inset-0 bg-red-500/80 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {formData.face_images.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-indigo-100/60 flex justify-between">
                            <button
                              type="button"
                              onClick={retakeLastPhoto}
                              className="text-xs text-indigo-600 hover:text-indigo-300 font-medium"
                            >
                              Retake last photo
                            </button>
                            <span className="text-xs text-slate-500">
                              {REQUIRED_FACE_PHOTOS - formData.face_images.length} remaining
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Review Details</h2>
                      <p className="text-xs text-slate-500">
                        Confirm information before submitting registration
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-indigo-100/60 bg-white/60 p-4">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Student ID</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.student_id || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Full Name</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.full_name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Email Address</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.email || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Phone Number</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.phone || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Department</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.department || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Course / Year</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {formData.course} (Year {formData.year})
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Face Profile</p>
                        <p className="text-xs font-semibold text-emerald-600">
                          {formData.face_images.length} / {REQUIRED_FACE_PHOTOS} Photos Captured
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER CONTROLS */}
            <div className="border-t border-indigo-100/60 bg-linear-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5 px-5 py-3 sm:px-7 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/60 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-500/10 transition-all"
                >
                  <ChevronLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                >
                  <Save size={14} /> {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
