import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import PublicNavbar from '../../components/navigation/PublicNavbar'

type UserRole = 'student' | 'faculty' | 'admin'

function LoginPage() {
  const [role, setRole] = useState<UserRole>('student')

  const [loginId, setLoginId] = useState('')

  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')

  const roleLabels: Record<UserRole, string> = {
    student: 'Student',
    faculty: 'Faculty',
    admin: 'Admin',
  }

  const loginIdLabels: Record<UserRole, string> = {
    student: 'Student ID',
    faculty: 'Faculty ID',
    admin: 'Admin ID',
  }

  const loginIdPlaceholders: Record<UserRole, string> = {
    student: 'Enter your student ID',
    faculty: 'Enter your faculty ID',
    admin: 'Enter your admin ID',
  }

  // ============================================================
  // ROLE CHANGE
  // ============================================================

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setLoginId('')
    setError('')
  }

  // ============================================================
  // LOGIN
  // ============================================================

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: loginId.trim(),
          password,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to sign in. Please check your credentials.')
      }

      // ========================================================
      // STORE AUTHENTICATION
      // ========================================================

      localStorage.setItem('access_token', data.access_token)

      localStorage.setItem('user', JSON.stringify(data.user))

      // ========================================================
      // ROLE REDIRECTION
      // ========================================================

      switch (data.user.role) {
        case 'student':
          window.location.href = '/student/dashboard'
          break

        case 'faculty':
          window.location.href = '/faculty/dashboard'
          break

        case 'admin':
          window.location.href = '/admin/dashboard'
          break

        default:
          throw new Error('Invalid user role returned by the server.')
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* =====================================================
          PUBLIC NAVIGATION
      ====================================================== */}

      <PublicNavbar />

      {/* =====================================================
          LOGIN SECTION
      ====================================================== */}

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-12 pt-28">
        {/* ===================================================
            BACKGROUND EFFECTS
        ==================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="
              absolute left-1/2 top-1/3
              h-112 w-md
              -translate-x-1/2
              rounded-full
              bg-cyan-500/10
              blur-3xl
            "
          />

          <div
            className="
              absolute bottom-0 left-1/4
              h-72 w-72
              rounded-full
              bg-amber-500/4
              blur-3xl
            "
          />

          <div
            className="
              absolute right-0 top-0
              h-72 w-72
              rounded-full
              bg-cyan-500/5
              blur-3xl
            "
          />
        </div>

        {/* ===================================================
            LOGIN CONTAINER
        ==================================================== */}

        <div className="relative z-10 w-full max-w-md">
          {/* =================================================
              LOGIN CARD
          ================================================= */}

          <div
            className="
              rounded-3xl
              border border-white/10
              bg-white/3
              p-7
              shadow-[0_30px_100px_-30px_rgba(0,0,0,0.9)]
              backdrop-blur-2xl
              sm:p-8
            "
          >
            {/* Header */}

            <div className="mb-7">
              <h2 className="text-xl font-semibold">Welcome back</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your credentials to continue.
              </p>
            </div>

            {/* =================================================
                FORM
            ================================================= */}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* =================================================
                  ROLE
              ================================================= */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Login as</label>

                <div
                  className="
                    grid grid-cols-3
                    gap-1.5
                    rounded-xl
                    border border-white/10
                    bg-white/3
                    p-1.5
                  "
                >
                  {(Object.keys(roleLabels) as UserRole[]).map((option) => {
                    const selected = role === option

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleRoleChange(option)}
                        className={`
                          rounded-lg
                          px-3 py-2.5
                          text-xs font-semibold
                          transition-all
                          duration-200

                          ${
                            selected
                              ? 'bg-cyan-500 text-neutral-950 shadow-[0_5px_20px_-8px_rgba(34,211,238,0.7)]'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        {roleLabels[option]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* =================================================
                  LOGIN ID
              ================================================= */}

              <div>
                <label htmlFor="loginId" className="mb-2 block text-sm font-medium text-slate-300">
                  {loginIdLabels[role]}
                </label>

                <div className="relative">
                  <UserRound
                    size={17}
                    strokeWidth={1.8}
                    className="
                      pointer-events-none
                      absolute left-4 top-1/2
                      -translate-y-1/2
                      text-slate-500
                    "
                  />

                  <input
                    id="loginId"
                    name="loginId"
                    type="text"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    placeholder={loginIdPlaceholders[role]}
                    autoComplete="username"
                    required
                    className="
                      h-12 w-full
                      rounded-xl
                      border border-white/10
                      bg-white/4
                      pl-11 pr-4
                      text-sm text-white
                      outline-none
                      transition-all
                      placeholder:text-slate-600
                      focus:border-cyan-400/40
                      focus:bg-white/6
                      focus:ring-2
                      focus:ring-cyan-500/10
                    "
                  />
                </div>
              </div>

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="
                      text-xs font-medium
                      text-cyan-400
                      transition-colors
                      hover:text-cyan-300
                    "
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    strokeWidth={1.8}
                    className="
                      pointer-events-none
                      absolute left-4 top-1/2
                      -translate-y-1/2
                      text-slate-500
                    "
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="
                      h-12 w-full
                      rounded-xl
                      border border-white/10
                      bg-white/4
                      pl-11 pr-12
                      text-sm text-white
                      outline-none
                      transition-all
                      placeholder:text-slate-600
                      focus:border-cyan-400/40
                      focus:bg-white/6
                      focus:ring-2
                      focus:ring-cyan-500/10
                    "
                  />

                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="
                      absolute right-3 top-1/2
                      flex h-8 w-8
                      -translate-y-1/2
                      items-center justify-center
                      rounded-lg
                      text-slate-500
                      transition-colors
                      hover:bg-white/5
                      hover:text-slate-200
                    "
                  >
                    {showPassword ? (
                      <EyeOff size={17} strokeWidth={1.8} />
                    ) : (
                      <Eye size={17} strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div
                  role="alert"
                  className="
                    rounded-xl
                    border border-red-500/20
                    bg-red-500/10
                    px-4 py-3
                    text-sm
                    text-red-400
                  "
                >
                  {error}
                </div>
              )}

              {/* =================================================
                  SIGN IN
              ================================================= */}

              <button
                type="submit"
                disabled={isLoading}
                className="
                  mt-2 flex h-12 w-full
                  items-center justify-center
                  gap-2
                  rounded-xl
                  bg-cyan-500
                  text-sm font-semibold
                  text-neutral-950
                  shadow-[0_10px_30px_-15px_rgba(34,211,238,0.8)]
                  transition-all
                  duration-300
                  hover:bg-cyan-400
                  hover:shadow-[0_10px_35px_-12px_rgba(34,211,238,0.7)]
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <LogIn size={16} strokeWidth={2} />

                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* =================================================
                SECURITY INDICATOR
            ================================================= */}

            <div
              className="
                mt-6
                flex items-center
                justify-center
                gap-2
                text-xs
                text-slate-500
              "
            >
              <LockKeyhole size={13} strokeWidth={1.8} />

              <span>Secure authentication</span>
            </div>
          </div>

          {/* =================================================
              BACK TO HOME
          ================================================= */}

          <Link
            to="/"
            className="
              mx-auto mt-7
              flex w-fit
              items-center
              gap-2
              text-sm
              text-slate-500
              transition-colors
              hover:text-cyan-300
            "
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
