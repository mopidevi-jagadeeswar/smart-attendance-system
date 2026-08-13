import { ArrowLeft, KeyRound, Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import PublicNavbar from '../../components/navigation/PublicNavbar'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setMessage('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to process your request. Please try again.')
      }

      setMessage(
        data.message ||
          'If an account exists with this email, password reset instructions have been sent.'
      )

      setEmail('')
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
      <PublicNavbar />

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-12 pt-28">
        {/* =================================================
            BACKGROUND
        ================================================== */}

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
              bg-blue-500/5
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

        {/* =================================================
            CARD
        ================================================== */}

        <div className="relative z-10 w-full max-w-md">
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
            {/* Icon */}

            <div
              className="
                mb-5 flex h-12 w-12
                items-center justify-center
                rounded-xl
                border border-cyan-500/20
                bg-cyan-500/10
                text-cyan-400
              "
            >
              <KeyRound size={22} strokeWidth={1.8} />
            </div>

            {/* Header */}

            <div className="mb-7">
              <h1 className="text-2xl font-semibold">Forgot your password?</h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter the email address associated with your account and we will send you
                instructions to reset your password.
              </p>
            </div>

            {/* Form */}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="
                    mb-2 block
                    text-sm font-medium
                    text-slate-300
                  "
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
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
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="email"
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

              {/* Success */}

              {message && (
                <div
                  role="status"
                  className="
                    rounded-xl
                    border border-emerald-500/20
                    bg-emerald-500/10
                    px-4 py-3
                    text-sm
                    leading-6
                    text-emerald-400
                  "
                >
                  {message}
                </div>
              )}

              {/* Error */}

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

              <button
                type="submit"
                disabled={isLoading}
                className="
                  flex h-12 w-full
                  items-center justify-center
                  gap-2
                  rounded-xl
                  bg-cyan-500
                  text-sm font-semibold
                  text-neutral-950
                  shadow-[0_10px_30px_-15px_rgba(34,211,238,0.8)]
                  transition-all duration-300
                  hover:bg-cyan-400
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <Send size={16} strokeWidth={1.8} />

                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          </div>

          {/* Back */}

          <Link
            to="/login"
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
            Back to Login
          </Link>
        </div>
      </main>
    </div>
  )
}

export default ForgotPasswordPage
