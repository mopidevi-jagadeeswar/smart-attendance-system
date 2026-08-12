import {
  Camera,
  Check,
  ChevronDown,
  CircleUserRound,
  Edit3,
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
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// ============================================================
// TYPES
// ============================================================

interface Student {
  id: string
  student_id: string
  login_id?: string
  full_name: string
  email: string
  department: string
  course: string
  year: number
  semester: number | null
  section: string | null
  phone: string | null
  date_of_birth?: string | null
  gender?: string | null
  photo_url: string | null
  is_active: boolean
  is_verified?: boolean
}

interface NFCCard {
  id: string
  student_id: string
  card_uid: string
  is_active: boolean
  registered_at: string | null
  last_used_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface FaceEnrollment {
  count: number
  required: number
  status: string
  model: string | null
  detector: string | null
}

interface StudentProfileResponse {
  student: Student
  face_enrollment: FaceEnrollment
  nfc_cards: NFCCard[]
}

interface StudentForm {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  department: string
  course: string
  year: string
  semester: string
  section: string
  is_active: boolean
}

type ModalType = 'profile' | 'edit' | 'nfc' | 'face' | null

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL = 'http://localhost:8000'

// ============================================================
// AUTH HELPERS
// ============================================================

const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

const getAuthHeaders = (): Record<string, string> => {
  const token = getAccessToken()

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

// ============================================================
// GENERAL HELPERS
// ============================================================

const getImageUrl = (photoUrl: string | null): string | null => {
  if (!photoUrl) {
    return null
  }

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl
  }

  return `${API_BASE_URL}${photoUrl}`
}

const getApiError = (requestError: unknown, fallback: string): string => {
  if (axios.isAxiosError(requestError)) {
    const detail = requestError.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (requestError.response?.status === 401) {
      return 'Your admin session has expired. Please log in again.'
    }

    if (requestError.response?.status === 403) {
      return 'You do not have permission to perform this action.'
    }

    if (requestError.response?.status === 404) {
      return 'The requested API endpoint was not found.'
    }

    if (requestError.code === 'ERR_NETWORK') {
      return 'Cannot connect to the backend. Make sure FastAPI is running on port 8000.'
    }
  }

  if (requestError instanceof Error) {
    return requestError.message
  }

  return fallback
}

const createStudentForm = (student: Student): StudentForm => {
  return {
    full_name: student.full_name,
    email: student.email,
    phone: student.phone ?? '',
    date_of_birth: student.date_of_birth ?? '',
    gender: student.gender ?? '',
    department: student.department,
    course: student.course,
    year: String(student.year),
    semester: student.semester === null ? '' : String(student.semester),
    section: student.section ?? '',
    is_active: student.is_active,
  }
}

// ============================================================
// MAIN PAGE
// ============================================================

function StudentsPage() {
  const navigate = useNavigate()

  // ----------------------------------------------------------
  // STUDENTS
  // ----------------------------------------------------------

  const [students, setStudents] = useState<Student[]>([])

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // ----------------------------------------------------------
  // PROFILE
  // ----------------------------------------------------------

  const [profile, setProfile] = useState<StudentProfileResponse | null>(null)

  const [profileLoading, setProfileLoading] = useState(false)

  const [profileError, setProfileError] = useState('')

  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  const [editForm, setEditForm] = useState<StudentForm | null>(null)

  const [editLoading, setEditLoading] = useState(false)

  const [editError, setEditError] = useState('')

  // ----------------------------------------------------------
  // NFC
  // ----------------------------------------------------------

  const [nfcUid, setNfcUid] = useState('')

  const [nfcLoading, setNfcLoading] = useState(false)

  const [nfcError, setNfcError] = useState('')

  const [nfcSuccess, setNfcSuccess] = useState('')

  // ----------------------------------------------------------
  // FACE
  // ----------------------------------------------------------

  const [faceImages, setFaceImages] = useState<File[]>([])

  const [facePreviews, setFacePreviews] = useState<string[]>([])

  const [faceLoading, setFaceLoading] = useState(false)

  const [faceError, setFaceError] = useState('')

  const [faceSuccess, setFaceSuccess] = useState('')

  // ----------------------------------------------------------
  // CAMERA
  // ----------------------------------------------------------

  const [cameraActive, setCameraActive] = useState(false)

  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const streamRef = useRef<MediaStream | null>(null)

  // ==========================================================
  // LOAD STUDENTS
  // ==========================================================

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = getAccessToken()

      if (!token) {
        setError('Admin authentication token was not found. Please log in again.')
        return
      }

      const response = await axios.get<Student[]>(`${API_BASE_URL}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 15000,
      })

      setStudents(Array.isArray(response.data) ? response.data : [])
    } catch (requestError) {
      console.error('Failed to load students:', requestError)

      setError(getApiError(requestError, 'Failed to load students. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [])

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudents()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadStudents])

  // ==========================================================
  // FILTERED STUDENTS
  // ==========================================================

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.student_id.toLowerCase().includes(query) ||
        student.full_name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.department.toLowerCase().includes(query) ||
        student.course.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && student.is_active) ||
        (statusFilter === 'inactive' && !student.is_active)

      return matchesSearch && matchesStatus
    })
  }, [students, search, statusFilter])

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const activeCount = students.filter((student) => student.is_active).length

  const inactiveCount = students.filter((student) => !student.is_active).length

  // ==========================================================
  // STOP CAMERA
  // ==========================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())

      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }, [])

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeModal = useCallback(() => {
    stopCamera()

    facePreviews.forEach((preview) => {
      URL.revokeObjectURL(preview)
    })

    setActiveModal(null)
    setSelectedStudent(null)

    setProfile(null)
    setProfileError('')

    setEditForm(null)
    setEditError('')

    setNfcUid('')
    setNfcError('')
    setNfcSuccess('')

    setFaceImages([])
    setFacePreviews([])
    setFaceError('')
    setFaceSuccess('')

    setCameraError('')
  }, [facePreviews, stopCamera])

  // ==========================================================
  // PROFILE
  // ==========================================================

  const openProfile = async (student: Student) => {
    setOpenMenu(null)
    setSelectedStudent(student)
    setActiveModal('profile')
    setProfile(null)
    setProfileError('')
    setProfileLoading(true)

    try {
      const response = await axios.get<StudentProfileResponse>(
        `${API_BASE_URL}/admin/students/${student.id}`,
        {
          headers: getAuthHeaders(),
          withCredentials: true,
          timeout: 15000,
        }
      )

      setProfile(response.data)
    } catch (requestError) {
      console.error('Failed to load student profile:', requestError)

      setProfileError(getApiError(requestError, 'Failed to load student profile.'))
    } finally {
      setProfileLoading(false)
    }
  }

  // ==========================================================
  // EDIT
  // ==========================================================

  const openEdit = (student: Student) => {
    setOpenMenu(null)
    setSelectedStudent(student)
    setEditForm(createStudentForm(student))
    setEditError('')
    setActiveModal('edit')
  }

  // ==========================================================
  // UPDATE STUDENT
  // ==========================================================

  const handleUpdateStudent = async () => {
    if (!selectedStudent || !editForm) {
      return
    }

    if (!editForm.full_name.trim()) {
      setEditError('Full name is required.')
      return
    }

    if (!editForm.email.trim()) {
      setEditError('Email is required.')
      return
    }

    setEditLoading(true)
    setEditError('')

    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender || null,
        department: editForm.department.trim(),
        course: editForm.course.trim(),
        year: Number(editForm.year),
        semester: editForm.semester ? Number(editForm.semester) : null,
        section: editForm.section.trim() || null,
        is_active: editForm.is_active,
      }

      await axios.put(`${API_BASE_URL}/admin/students/${selectedStudent.id}`, payload, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        timeout: 15000,
      })

      await loadStudents()

      closeModal()
    } catch (requestError) {
      console.error('Failed to update student:', requestError)

      setEditError(getApiError(requestError, 'Failed to update student.'))
    } finally {
      setEditLoading(false)
    }
  }

  // ==========================================================
  // NFC
  // ==========================================================

  const openNfc = async (student: Student) => {
    setOpenMenu(null)
    setSelectedStudent(student)
    setActiveModal('nfc')
    setNfcUid('')
    setNfcError('')
    setNfcSuccess('')
    setProfile(null)
    setProfileLoading(true)

    try {
      const response = await axios.get<StudentProfileResponse>(
        `${API_BASE_URL}/admin/students/${student.id}`,
        {
          headers: getAuthHeaders(),
          withCredentials: true,
          timeout: 15000,
        }
      )

      setProfile(response.data)
    } catch (requestError) {
      console.error('Failed to load NFC information:', requestError)

      setNfcError(getApiError(requestError, 'Unable to load current NFC information.'))
    } finally {
      setProfileLoading(false)
    }
  }

  // ==========================================================
  // REGISTER NFC
  // ==========================================================

  const handleRegisterNfc = async () => {
    if (!selectedStudent) {
      return
    }

    const uid = nfcUid.trim()

    if (!uid) {
      setNfcError('Enter an NFC card UID.')
      return
    }

    setNfcLoading(true)
    setNfcError('')
    setNfcSuccess('')

    try {
      await axios.post(
        `${API_BASE_URL}/admin/students/${selectedStudent.id}/nfc`,
        {
          card_uid: uid,
        },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          timeout: 15000,
        }
      )

      setNfcSuccess('NFC card registered successfully.')

      const response = await axios.get<StudentProfileResponse>(
        `${API_BASE_URL}/admin/students/${selectedStudent.id}`,
        {
          headers: getAuthHeaders(),
          withCredentials: true,
          timeout: 15000,
        }
      )

      setProfile(response.data)

      await loadStudents()

      setNfcUid('')
    } catch (requestError) {
      console.error('Failed to register NFC:', requestError)

      setNfcError(getApiError(requestError, 'Failed to register NFC card.'))
    } finally {
      setNfcLoading(false)
    }
  }

  // ==========================================================
  // START CAMERA
  // ==========================================================

  const startCamera = async () => {
    setCameraError('')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: {
            ideal: 640,
          },
          height: {
            ideal: 480,
          },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraActive(true)
    } catch (requestError) {
      console.error('Unable to start camera:', requestError)

      setCameraError('Camera permission was denied or the camera is unavailable.')
    }
  }

  // ==========================================================
  // CAPTURE FACE
  // ==========================================================

  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) {
      return
    }

    if (faceImages.length >= 5) {
      setFaceError('You already captured five images.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setFaceError('Camera is not ready yet. Please wait a moment.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setFaceError('Unable to capture the camera image.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setFaceError('Unable to create the captured image.')
          return
        }

        const imageNumber = faceImages.length + 1

        const file = new File([blob], `face_${imageNumber}.jpg`, {
          type: 'image/jpeg',
        })

        const previewUrl = URL.createObjectURL(blob)

        setFaceImages((current) => [...current, file])

        setFacePreviews((current) => [...current, previewUrl])

        setFaceError('')
      },
      'image/jpeg',
      0.92
    )
  }

  // ==========================================================
  // REMOVE FACE IMAGE
  // ==========================================================

  const removeFaceImage = (index: number) => {
    const preview = facePreviews[index]

    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setFaceImages((current) => current.filter((_, imageIndex) => imageIndex !== index))

    setFacePreviews((current) => current.filter((_, imageIndex) => imageIndex !== index))
  }

  // ==========================================================
  // FILE UPLOAD
  // ==========================================================

  const handleFaceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (!files.length) {
      return
    }

    const availableSlots = 5 - faceImages.length

    const selectedFiles = files
      .slice(0, availableSlots)
      .filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))

    const previews = selectedFiles.map((file) => URL.createObjectURL(file))

    setFaceImages((current) => [...current, ...selectedFiles])

    setFacePreviews((current) => [...current, ...previews])

    setFaceError('')

    event.target.value = ''
  }

  // ==========================================================
  // OPEN FACE ENROLLMENT
  // ==========================================================

  const openFaceEnrollment = (student: Student) => {
    setOpenMenu(null)
    setSelectedStudent(student)
    setActiveModal('face')
    setFaceImages([])
    setFacePreviews([])
    setFaceError('')
    setFaceSuccess('')
    setCameraError('')
    setCameraActive(false)
  }

  // ==========================================================
  // FACE ENROLLMENT
  // ==========================================================

  const handleFaceEnrollment = async () => {
    if (!selectedStudent) {
      return
    }

    if (faceImages.length !== 5) {
      setFaceError('Please capture or select exactly 5 face images.')
      return
    }

    setFaceLoading(true)
    setFaceError('')
    setFaceSuccess('')

    try {
      const formData = new FormData()

      faceImages.forEach((file) => {
        formData.append('face_images', file)
      })

      await axios.post(`${API_BASE_URL}/admin/students/${selectedStudent.id}/face`, formData, {
        headers: {
          ...getAuthHeaders(),
        },
        withCredentials: true,
        timeout: 120000,
      })

      stopCamera()

      setFaceSuccess('Face enrollment updated successfully.')

      await loadStudents()
    } catch (requestError) {
      console.error('Failed to update face enrollment:', requestError)

      setFaceError(getApiError(requestError, 'Failed to update face enrollment.'))
    } finally {
      setFaceLoading(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-slate-100 text-black">
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-400/10 blur-[120px]" />

      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-400/10 blur-[130px]" />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-400/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                  <Users size={18} strokeWidth={1.8} />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500 ">
                  Administration
                </p>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-black sm:text-3xl">
                Students
              </h1>

              <p className="mt-1 text-sm text-black">
                Manage student profiles, face data, and NFC access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/students/register')}
              className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:from-indigo-500 hover:to-purple-500"
            >
              <Plus size={17} />
              Register Student
            </button>
          </div>
        </div>

        {/* ====================================================
            STATISTICS
        ===================================================== */}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Students"
            value={students.length}
            icon={<Users size={18} />}
            variant="indigo"
          />

          <StatCard
            label="Active Students"
            value={activeCount}
            icon={<ShieldCheck size={18} />}
            variant="emerald"
          />

          <StatCard
            label="Inactive Students"
            value={inactiveCount}
            icon={<UserRound size={18} />}
            variant="amber"
          />
        </div>

        {/* ====================================================
            STUDENT TABLE
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-indigo-500/10 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <div className="h-px bg-linear-to-r from-transparent via-indigo-500/60 to-transparent" />

          {/* Toolbar */}

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white/90 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-black backdrop-blur-md outline-none transition placeholder:text-black focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
                }
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-semibold text-black backdrop-blur-md outline-none focus:border-indigo-500 "
              >
                <option value="all">All Students</option>

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
            <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 ">
              <div className="flex items-center justify-between gap-4">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void loadStudents()}
                  className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 "
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading */}

          {loading ? (
            <div className="flex min-h-90 flex-col items-center justify-center">
              <Loader2 size={28} className="animate-spin text-indigo-500" />

              <p className="mt-3 text-sm font-medium text-black">Loading students...</p>

              <p className="mt-1 text-xs text-black">Fetching student records from the database.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="border-b border-slate-200 bg-linear-to-r from-indigo-500/5 via-purple-500/5 to-cyan-500/5">
                      <th className={tableHeader}>Student</th>

                      <th className={tableHeader}>Student ID</th>

                      <th className={tableHeader}>Department</th>

                      <th className={tableHeader}>Course</th>

                      <th className={tableHeader}>Academic</th>

                      <th className={tableHeader}>Status</th>

                      <th className={`${tableHeader} text-right`}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 ">
                              <Users size={21} />
                            </div>

                            <p className="mt-3 text-sm font-semibold">
                              {students.length === 0
                                ? 'No students registered yet'
                                : 'No students found'}
                            </p>

                            <p className="mt-1 text-xs text-black">
                              {students.length === 0
                                ? 'Register your first student to see them here.'
                                : 'Try changing your search or status filter.'}
                            </p>

                            {students.length === 0 && (
                              <button
                                type="button"
                                onClick={() => navigate('/admin/students/register')}
                                className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                <Plus size={14} />
                                Register Student
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-slate-200 bg-white/70 transition-all duration-200 hover:bg-white"
                        >
                          {/* Student */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {getImageUrl(student.photo_url) ? (
                                <img
                                  src={getImageUrl(student.photo_url) ?? undefined}
                                  alt={student.full_name}
                                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 ring-1 ring-indigo-500/20 ">
                                  <UserRound size={18} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-black">
                                  {student.full_name}
                                </p>

                                <p className="max-w-55 truncate text-xs text-black">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* ID */}

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 ">
                              {student.student_id}
                            </span>
                          </td>

                          {/* Department */}

                          <td className="px-5 py-4">
                            <p className="text-sm text-black">{student.department}</p>
                          </td>

                          {/* Course */}

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-black">{student.course}</p>
                          </td>

                          {/* Academic */}

                          <td className="px-5 py-4">
                            <p className="text-xs font-medium text-black">
                              Year {student.year}
                              {student.semester !== null && ` • Sem ${student.semester}`}
                            </p>

                            {student.section && (
                              <p className="mt-0.5 text-[11px] text-black">
                                Section {student.section}
                              </p>
                            )}
                          </td>

                          {/* Status */}

                          <td className="px-5 py-4">
                            <StatusBadge active={student.is_active} />
                          </td>

                          {/* Actions */}

                          <td className="relative px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenu(openMenu === student.id ? null : student.id)
                              }
                              className="rounded-lg p-2 text-black transition hover:bg-indigo-500/10 hover:text-indigo-600"
                              aria-label={`Actions for ${student.full_name}`}
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {openMenu === student.id && (
                              <div className="absolute right-5 top-12 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
                                <button
                                  type="button"
                                  onClick={() => void openProfile(student)}
                                  className={menuItem}
                                >
                                  <CircleUserRound size={15} />
                                  View Profile
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEdit(student)}
                                  className={menuItem}
                                >
                                  <Edit3 size={15} />
                                  Edit Student
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void openNfc(student)}
                                  className={menuItem}
                                >
                                  <Fingerprint size={15} />
                                  Register NFC
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openFaceEnrollment(student)}
                                  className={menuItem}
                                >
                                  <Camera size={15} />
                                  Face Enrollment
                                </button>
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

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5">
                <p className="text-xs text-black">
                  Showing{' '}
                  <span className="font-semibold text-black">{filteredStudents.length}</span> of{' '}
                  <span className="font-semibold text-black">{students.length}</span> students
                </p>

                <button
                  type="button"
                  onClick={() => void loadStudents()}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 "
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          PROFILE MODAL
      ======================================================= */}

      {activeModal === 'profile' && selectedStudent && (
        <ModalShell
          title="Student Profile"
          subtitle="Complete student information"
          icon={<CircleUserRound size={19} />}
          onClose={closeModal}
        >
          {profileLoading ? (
            <ModalLoading text="Loading student profile..." />
          ) : profileError ? (
            <ModalError message={profileError} onRetry={() => void openProfile(selectedStudent)} />
          ) : profile ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                {getImageUrl(profile.student.photo_url) ? (
                  <img
                    src={getImageUrl(profile.student.photo_url) ?? undefined}
                    alt={profile.student.full_name}
                    className="h-20 w-20 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 ">
                    <UserRound size={30} />
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="text-xl font-black text-black">{profile.student.full_name}</h3>

                  <p className="mt-1 text-sm font-semibold text-indigo-500 ">
                    {profile.student.student_id}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge active={profile.student.is_active} />

                    {profile.student.is_verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-600 ">
                        <Check size={11} />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="Email" value={profile.student.email} />

                <InfoCard label="Phone" value={profile.student.phone || 'Not provided'} />

                <InfoCard label="Department" value={profile.student.department} />

                <InfoCard label="Course" value={profile.student.course} />

                <InfoCard label="Academic Year" value={`Year ${profile.student.year}`} />

                <InfoCard
                  label="Semester"
                  value={
                    profile.student.semester
                      ? `Semester ${profile.student.semester}`
                      : 'Not provided'
                  }
                />

                <InfoCard label="Section" value={profile.student.section || 'Not provided'} />

                <InfoCard label="Gender" value={profile.student.gender || 'Not provided'} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-purple-500" />

                    <span className="text-xs font-bold text-purple-600 ">Face Enrollment</span>
                  </div>

                  <p className="mt-3 text-xl font-black">
                    {profile.face_enrollment.count} / {profile.face_enrollment.required}
                  </p>

                  <p className="mt-1 text-[10px] uppercase tracking-wider text-black">
                    {profile.face_enrollment.status}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={16} className="text-cyan-500" />

                    <span className="text-xs font-bold text-cyan-600 ">NFC</span>
                  </div>

                  {profile.nfc_cards
                    .filter((card) => card.is_active)
                    .map((card) => (
                      <div key={card.id} className="mt-3">
                        <p className="break-all font-mono text-sm font-bold">{card.card_uid}</p>

                        <p className="mt-1 text-[10px] text-emerald-500">Active card</p>
                      </div>
                    ))}

                  {profile.nfc_cards.filter((card) => card.is_active).length === 0 && (
                    <p className="mt-3 text-sm font-semibold text-black">No active NFC card</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(profile.student)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3.5 py-2.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-500/20 "
                >
                  <Edit3 size={14} />
                  Edit Profile
                </button>

                <button
                  type="button"
                  onClick={() => void openNfc(profile.student)}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-3.5 py-2.5 text-xs font-bold text-cyan-600 transition hover:bg-cyan-500/20 "
                >
                  <Fingerprint size={14} />
                  Register NFC
                </button>

                <button
                  type="button"
                  onClick={() => openFaceEnrollment(profile.student)}
                  className="flex items-center gap-2 rounded-xl bg-purple-500/10 px-3.5 py-2.5 text-xs font-bold text-purple-600 transition hover:bg-purple-500/20 "
                >
                  <Camera size={14} />
                  Update Face
                </button>
              </div>
            </div>
          ) : null}
        </ModalShell>
      )}

      {/* ======================================================
          EDIT MODAL
      ======================================================= */}

      {activeModal === 'edit' && selectedStudent && editForm && (
        <ModalShell
          title="Edit Student"
          subtitle={`Update ${selectedStudent.full_name}'s profile`}
          icon={<Edit3 size={19} />}
          onClose={closeModal}
        >
          <div className="space-y-4">
            {editError && <InlineError message={editError} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Full Name"
                value={editForm.full_name}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          full_name: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          email: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Phone"
                value={editForm.phone}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          phone: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Date of Birth"
                type="date"
                value={editForm.date_of_birth}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          date_of_birth: value,
                        }
                      : current
                  )
                }
              />

              <SelectField
                label="Gender"
                value={editForm.gender}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          gender: value,
                        }
                      : current
                  )
                }
                options={[
                  ['', 'Select gender'],
                  ['Male', 'Male'],
                  ['Female', 'Female'],
                  ['Other', 'Other'],
                ]}
              />

              <FormField
                label="Department"
                value={editForm.department}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          department: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Course"
                value={editForm.course}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          course: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Year"
                type="number"
                min="1"
                value={editForm.year}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          year: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Semester"
                type="number"
                min="1"
                value={editForm.semester}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          semester: value,
                        }
                      : current
                  )
                }
              />

              <FormField
                label="Section"
                value={editForm.section}
                onChange={(value) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          section: value,
                        }
                      : current
                  )
                }
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md">
              <div>
                <p className="text-xs font-bold">Student Account</p>

                <p className="mt-0.5 text-[10px] text-black">
                  Allow this student to use the system.
                </p>
              </div>

              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(event) =>
                  setEditForm((current) =>
                    current
                      ? {
                          ...current,
                          is_active: event.target.checked,
                        }
                      : current
                  )
                }
                className="h-4 w-4 accent-indigo-600"
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={editLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-black hover:bg-white/90"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleUpdateStudent()}
                disabled={editLoading}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {editLoading && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ======================================================
          NFC MODAL
      ======================================================= */}

      {activeModal === 'nfc' && selectedStudent && (
        <ModalShell
          title="Register NFC"
          subtitle={`Assign an NFC card to ${selectedStudent.full_name}`}
          icon={<Fingerprint size={19} />}
          onClose={closeModal}
        >
          <div className="space-y-5">
            {nfcError && <InlineError message={nfcError} />}

            {nfcSuccess && <InlineSuccess message={nfcSuccess} />}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                  <UserRound size={18} />
                </div>

                <div>
                  <p className="text-sm font-bold">{selectedStudent.full_name}</p>

                  <p className="text-xs text-black">{selectedStudent.student_id}</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="nfc-card-uid" className="mb-2 block text-xs font-bold text-black">
                NFC Card UID
              </label>

              <input
                id="nfc-card-uid"
                type="text"
                value={nfcUid}
                onChange={(event) => setNfcUid(event.target.value)}
                placeholder="Example: 04:A3:7B:91:22"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 font-mono text-sm text-black outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 "
              />

              <p className="mt-2 text-[10px] text-black">
                Enter the UID read from the NFC card or reader.
              </p>
            </div>

            {profileLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-black">
                <Loader2 size={14} className="animate-spin" />
                Checking current NFC registration...
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-black">
                  Current Active Card
                </p>

                {profile?.nfc_cards.find((card) => card.is_active) ? (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="break-all font-mono text-xs font-bold">
                      {profile.nfc_cards.find((card) => card.is_active)?.card_uid}
                    </span>

                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-500">
                      ACTIVE
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-black">No active NFC card.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={nfcLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-black hover:bg-white/90"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleRegisterNfc()}
                disabled={nfcLoading}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {nfcLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Fingerprint size={14} />
                )}
                Register NFC
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ======================================================
          FACE MODAL
      ======================================================= */}

      {activeModal === 'face' && selectedStudent && (
        <ModalShell
          title="Face Enrollment"
          subtitle={`Update face data for ${selectedStudent.full_name}`}
          icon={<Camera size={19} />}
          onClose={closeModal}
          wide
        >
          <div className="space-y-5">
            {faceError && <InlineError message={faceError} />}

            {faceSuccess && <InlineSuccess message={faceSuccess} />}

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Camera */}

              <div className="overflow-hidden rounded-2xl border border-purple-500/15 bg-neutral-950">
                <div className="relative aspect-video overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                        <Camera size={25} />
                      </div>

                      <p className="mt-3 text-sm font-bold text-white">Camera ready</p>

                      <p className="mt-1 max-w-xs text-[10px] text-black">
                        Start the camera and capture five clear face images.
                      </p>

                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        <Camera size={14} />
                        Start Camera
                      </button>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
                      <span className="text-[10px] font-semibold text-white/80">
                        Capture {faceImages.length + 1} / 5
                      </span>

                      <button
                        type="button"
                        onClick={captureFace}
                        disabled={faceImages.length >= 5}
                        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black shadow-xl disabled:opacity-40"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        Capture
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <p className="border-t border-red-500/10 bg-red-500/5 px-4 py-2 text-[10px] text-red-400">
                    {cameraError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-black transition hover:bg-slate-200">
                    <Plus size={13} />
                    Upload Images
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFaceFileChange}
                      className="hidden"
                    />
                  </label>

                  {cameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-xl bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/20"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Captured Images */}

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">Captured Images</h3>

                    <p className="mt-1 text-[10px] text-black">Exactly five images are required.</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      faceImages.length === 5
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {faceImages.length} / 5
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => {
                    const preview = facePreviews[index]

                    return (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white/90"
                      >
                        {preview ? (
                          <>
                            <img
                              src={preview}
                              alt={`Face capture ${index + 1}`}
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() => removeFaceImage(index)}
                              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500"
                              aria-label={`Remove face image ${index + 1}`}
                            >
                              <X size={12} />
                            </button>

                            <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold text-white">
                              {index + 1}
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center text-black">
                            <Camera size={18} strokeWidth={1.5} />

                            <span className="mt-1 text-[9px] font-bold">Image {index + 1}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-purple-500/10 bg-purple-500/5 p-3">
                  <p className="text-[10px] font-bold text-purple-600 ">Enrollment Tips</p>

                  <ul className="mt-2 space-y-1 text-[9px] text-black">
                    <li>• Keep the face clearly visible.</li>

                    <li>• Use good and consistent lighting.</li>

                    <li>• Avoid masks, sunglasses, or heavy occlusion.</li>

                    <li>• Capture slightly different natural angles.</li>
                  </ul>
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={faceLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-black hover:bg-white/90"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleFaceEnrollment()}
                disabled={faceLoading || faceImages.length !== 5}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {faceLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Update Face Data
              </button>
            </div>
          </div>
        </ModalShell>
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
    indigo:
      'border-indigo-300/70 bg-gradient-to-br from-indigo-100 via-white/95 to-cyan-100/80 text-indigo-600 shadow-indigo-200/40',
    emerald:
      'border-emerald-300/70 bg-gradient-to-br from-emerald-100 via-white/95 to-teal-100/80 text-emerald-600 shadow-emerald-200/40',
    amber:
      'border-amber-300/70 bg-gradient-to-br from-amber-100 via-white/95 to-orange-100/80 text-amber-600 shadow-amber-200/40',
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${variants[variant]}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-current opacity-[0.08] blur-3xl transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-black">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/60 shadow-sm backdrop-blur-md">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL SHELL
// ============================================================

interface ModalShellProps {
  title: string
  subtitle: string
  icon: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

function ModalShell({ title, subtitle, icon, onClose, children, wide = false }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-indigo-500/15 bg-white shadow-2xl shadow-black/30 ${
          wide ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500/15 to-purple-500/15 text-indigo-500 ">
                {icon}
              </div>

              <div>
                <h2 className="text-base font-black text-black">{title}</h2>

                <p className="mt-0.5 text-[10px] text-black">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-black transition hover:bg-white hover:text-black backdrop-blur-md"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL LOADING
// ============================================================

function ModalLoading({ text }: { text: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-500" />

      <p className="mt-3 text-sm font-semibold">{text}</p>
    </div>
  )
}

// ============================================================
// MODAL ERROR
// ============================================================

function ModalError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <X size={20} />
      </div>

      <p className="mt-3 max-w-md text-sm font-semibold text-red-500">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20"
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  )
}

// ============================================================
// INLINE ERROR
// ============================================================

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-xs font-medium text-red-500">
      {message}
    </div>
  )
}

// ============================================================
// INLINE SUCCESS
// ============================================================

function InlineSuccess({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-500">
      <Check size={14} />
      {message}
    </div>
  )
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-3 backdrop-blur-md">
      <p className="text-[9px] font-bold uppercase tracking-wider text-black">{label}</p>

      <p className="mt-1.5 wrap-break-word text-xs font-semibold text-black">{value}</p>
    </div>
  )
}

// ============================================================
// FORM FIELD
// ============================================================

interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
}

function FormField({ label, value, onChange, type = 'text', min }: FormFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-black">
        {label}
      </label>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-black backdrop-blur-md outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
      />
    </div>
  )
}

// ============================================================
// SELECT FIELD
// ============================================================

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-black">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-black backdrop-blur-md outline-none transition focus:border-indigo-400 focus:bg-white "
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        active ? 'bg-emerald-500/10 text-emerald-600 ' : 'bg-slate-500/10 text-black '
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]' : 'bg-slate-400'
        }`}
      />

      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// ============================================================
// MENU ITEM
// ============================================================

const menuItem =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-indigo-500/10 hover:text-indigo-600'

// ============================================================
// TABLE HEADER
// ============================================================

const tableHeader = 'px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-black '

export default StudentsPage

//final update at august 11 - 2026
