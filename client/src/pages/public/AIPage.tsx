import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'

import PublicNavbar from '../../components/navigation/PublicNavbar'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIResponse {
  response?: string
  message?: string
  answer?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const QUICK_ACTIONS = [
  {
    label: 'My Attendance',
    prompt: 'Show me my current attendance percentage and attendance details.',
    icon: CheckCircle2,
  },
  {
    label: "Today's Classes",
    prompt: 'What classes do I have today?',
    icon: Clock3,
  },
  {
    label: 'My Timetable',
    prompt: 'Show me my timetable.',
    icon: CalendarDays,
  },
  {
    label: 'Upcoming Exams',
    prompt: 'What are my upcoming exams?',
    icon: GraduationCap,
  },
  {
    label: 'Holidays',
    prompt: 'What are the upcoming holidays and college events?',
    icon: CalendarDays,
  },
  {
    label: 'Study Plan',
    prompt: 'Create a study timetable for me based on my subjects and exams.',
    icon: Sparkles,
  },
]

const CAPABILITIES = [
  {
    label: 'Attendance',
    icon: CheckCircle2,
  },
  {
    label: 'Timetable',
    icon: CalendarDays,
  },
  {
    label: 'Classes',
    icon: Clock3,
  },
  {
    label: 'Exams',
    icon: GraduationCap,
  },
  {
    label: 'Holidays',
    icon: CalendarDays,
  },
  {
    label: 'Study Planning',
    icon: Sparkles,
  },
]

function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your Smart Campus Assistant. I can help you with attendance, timetable, classes, exams, holidays, academic information, and study planning. What would you like to know?",
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (messageText?: string): Promise<void> => {
    const text = (messageText ?? input).trim()

    if (!text || isLoading) {
      return
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((previous) => [...previous, userMessage])

    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
        }),
      })

      if (!response.ok) {
        let errorMessage = `AI request failed with status ${response.status}.`

        try {
          const errorData: unknown = await response.json()

          if (
            typeof errorData === 'object' &&
            errorData !== null &&
            'detail' in errorData &&
            typeof errorData.detail === 'string'
          ) {
            errorMessage = errorData.detail
          }
        } catch {
          // Keep default error.
        }

        throw new Error(errorMessage)
      }

      const data = (await response.json()) as AIResponse

      const assistantText = data.response ?? data.message ?? data.answer

      if (!assistantText) {
        throw new Error('The AI server returned an empty response.')
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      }

      setMessages((previous) => [...previous, assistantMessage])
    } catch (requestError) {
      console.error('AI request failed:', requestError)

      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to connect to the AI assistant.'

      setError(message)
    } finally {
      setIsLoading(false)

      window.setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  // ============================================================
  // FORM
  // ============================================================

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage()
  }

  // ============================================================
  // KEYBOARD
  // ============================================================

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  // ============================================================
  // CLEAR CHAT
  // ============================================================

  const clearChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          "Chat cleared. I'm ready to help with your academics, attendance, timetable, exams, calendar, and study planning.",
        timestamp: new Date(),
      },
    ])

    setError(null)
  }

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-900">
      {/* ======================================================
          PUBLIC NAVBAR
      ======================================================= */}

      <PublicNavbar />

      {/* ======================================================
          BACKGROUND GLOW
      ======================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="
          absolute
          -left-32
          top-20
          h-80
          w-80
          rounded-full
          bg-indigo-600/20
          blur-[120px]
        "
        />

        <div
          className="
          absolute
          -right-30
          top-1/3
          h-96
          w-96
          rounded-full
          bg-purple-600/15
          blur-[130px]
        "
        />

        <div
          className="
          absolute
          -bottom-25
          left-1/2
          h-80
          w-80
          -translate-x-1/2
          rounded-full
          bg-cyan-500/10
          blur-[120px]
        "
        />
      </div>

      {/* ======================================================
          PAGE
      ======================================================= */}

      <div
        className="
        relative
        z-10
        flex
        min-h-screen
        px-3
        pb-3
        pt-21
        sm:px-4
        sm:pb-4
      "
      >
        <div
          className="
          mx-auto
          flex
          min-h-0
          w-full
          max-w-7xl
          flex-1
          gap-4
        "
        >
          {/* ==================================================
              SIDEBAR
          =================================================== */}

          <aside
            className="
            hidden
            w-64
            shrink-0
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-white/10
            bg-white
            shadow-[0_0_50px_rgba(99,102,241,0.15)]
            lg:flex
          "
          >
            {/* Sidebar Header */}

            <div
              className="
              border-b
              border-slate-200
              p-4
            "
            >
              <div
                className="
                flex
                items-center
                gap-3
              "
              >
                <div
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-linear-to-br
                  from-indigo-500
                  to-purple-600
                  text-white
                  shadow-lg
                  shadow-indigo-500/20
                "
                >
                  <Bot size={20} strokeWidth={1.8} />
                </div>

                <div>
                  <h1
                    className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                  >
                    Smart Assistant
                  </h1>

                  <p
                    className="
                    mt-0.5
                    text-[10px]
                    font-medium
                    text-slate-500
                  "
                  >
                    Campus AI
                  </p>
                </div>
              </div>
            </div>

            {/* Capabilities */}

            <div
              className="
              flex-1
              overflow-y-auto
              p-3
            "
            >
              <p
                className="
                mb-2
                px-2
                text-[9px]
                font-black
                uppercase
                tracking-[0.18em]
                text-slate-400
              "
              >
                I can help with
              </p>

              <div className="space-y-1">
                {CAPABILITIES.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className="
                        flex
                        items-center
                        gap-2.5
                        rounded-xl
                        px-2.5
                        py-2.5
                        transition
                        hover:bg-indigo-50
                      "
                    >
                      <Icon size={15} strokeWidth={1.8} className="text-indigo-600" />

                      <span
                        className="
                        text-xs
                        font-medium
                        text-slate-700
                      "
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Quick Actions */}

              <div className="mt-6">
                <p
                  className="
                  mb-2
                  px-2
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-slate-400
                "
                >
                  Quick Actions
                </p>

                <div className="space-y-1">
                  {QUICK_ACTIONS.slice(0, 4).map((action) => {
                    const Icon = action.icon

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => void sendMessage(action.prompt)}
                        disabled={isLoading}
                        className="
                            group
                            flex
                            w-full
                            items-center
                            gap-2
                            rounded-xl
                            px-2.5
                            py-2
                            text-left
                            transition
                            hover:bg-slate-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                      >
                        <Icon
                          size={13}
                          className="
                              text-slate-500
                              transition
                              group-hover:text-indigo-600
                            "
                        />

                        <span
                          className="
                            text-[11px]
                            font-medium
                            text-slate-600
                            group-hover:text-slate-900
                          "
                        >
                          {action.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Status */}

            <div
              className="
              border-t
              border-slate-200
              p-3
            "
            >
              <div
                className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-3
                py-2.5
              "
              >
                <span
                  className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-emerald-500
                  shadow-[0_0_8px_rgba(16,185,129,0.7)]
                "
                />

                <span
                  className="
                  text-[10px]
                  font-semibold
                  text-emerald-700
                "
                >
                  AI Assistant Ready
                </span>
              </div>
            </div>
          </aside>

          {/* ==================================================
              CHAT
          =================================================== */}

          <main
            className="
            flex
            min-h-0
            flex-1
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-white/10
            bg-white
            shadow-[0_0_60px_rgba(99,102,241,0.15)]
          "
          >
            {/* Chat Header */}

            <header
              className="
              flex
              shrink-0
              items-center
              justify-between
              border-b
              border-slate-200
              bg-white
              px-4
              py-3
              sm:px-5
            "
            >
              <div
                className="
                flex
                items-center
                gap-3
              "
              >
                <div
                  className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-indigo-200
                  bg-indigo-50
                  text-indigo-600
                "
                >
                  <Sparkles size={17} strokeWidth={1.8} />
                </div>

                <div>
                  <h2
                    className="
                    text-sm
                    font-bold
                    text-slate-900
                    sm:text-base
                  "
                  >
                    Smart Campus Assistant
                  </h2>

                  <div
                    className="
                    mt-0.5
                    flex
                    items-center
                    gap-1.5
                  "
                  >
                    <span
                      className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-emerald-500
                    "
                    />

                    <span
                      className="
                      text-[10px]
                      font-medium
                      text-slate-500
                    "
                    >
                      Ready to help
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  text-slate-500
                  transition
                  hover:border-indigo-200
                  hover:bg-indigo-50
                  hover:text-indigo-600
                "
              >
                <RefreshCw size={14} />
              </button>
            </header>

            {/* Messages */}

            <div
              className="
              min-h-0
              flex-1
              overflow-y-auto
              bg-slate-50/50
              px-3
              py-4
              sm:px-5
            "
            >
              <div
                className="
                mx-auto
                flex
                w-full
                max-w-4xl
                flex-col
                gap-4
              "
              >
                {messages.map((message) => {
                  const isUser = message.role === 'user'

                  return (
                    <div
                      key={message.id}
                      className={`
                        flex
                        items-end
                        gap-2.5
                        ${isUser ? 'justify-end' : 'justify-start'}
                      `}
                    >
                      {!isUser && (
                        <div
                          className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-linear-to-br
                          from-indigo-500
                          to-purple-600
                          text-white
                          shadow-md
                          shadow-indigo-500/20
                        "
                        >
                          <Bot size={15} strokeWidth={1.8} />
                        </div>
                      )}

                      <div
                        className="
                        max-w-[85%]
                        sm:max-w-[75%]
                      "
                      >
                        <div
                          className={`
                            rounded-2xl
                            px-4
                            py-3
                            text-sm
                            leading-6
                            shadow-sm
                            ${
                              isUser
                                ? `
                                  rounded-br-md
                                  bg-indigo-600
                                  text-white
                                `
                                : `
                                  rounded-bl-md
                                  border
                                  border-slate-200
                                  bg-white
                                  text-slate-800
                                `
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>

                        <div
                          className={`
                            mt-1.5
                            px-1
                            text-[9px]
                            font-medium
                            text-slate-400
                            ${isUser ? 'text-right' : 'text-left'}
                          `}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>

                      {isUser && (
                        <div
                          className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-indigo-200
                          bg-indigo-50
                          text-indigo-600
                        "
                        >
                          <User size={15} strokeWidth={1.8} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Loading */}

                {isLoading && (
                  <div
                    className="
                    flex
                    items-end
                    gap-2.5
                  "
                  >
                    <div
                      className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-linear-to-br
                      from-indigo-500
                      to-purple-600
                      text-white
                    "
                    >
                      <Bot size={15} strokeWidth={1.8} />
                    </div>

                    <div
                      className="
                      rounded-2xl
                      rounded-bl-md
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3
                    "
                    >
                      <div
                        className="
                        flex
                        items-center
                        gap-1.5
                      "
                      >
                        <span
                          className="
                          h-1.5
                          w-1.5
                          animate-bounce
                          rounded-full
                          bg-indigo-500
                        "
                        />

                        <span
                          className="
                          h-1.5
                          w-1.5
                          animate-bounce
                          rounded-full
                          bg-purple-500
                          [animation-delay:-0.15s]
                        "
                        />

                        <span
                          className="
                          h-1.5
                          w-1.5
                          animate-bounce
                          rounded-full
                          bg-cyan-500
                          [animation-delay:-0.3s]
                        "
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Error */}

            {error && (
              <div
                className="
                mx-3
                mb-2
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-3
                py-2
                sm:mx-5
              "
              >
                <div
                  className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
                >
                  <p
                    className="
                    text-[10px]
                    font-medium
                    text-red-700
                  "
                  >
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => setError(null)}
                    aria-label="Dismiss error"
                    className="
                      text-red-500
                      hover:text-red-700
                    "
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Quick Actions */}

            <div
              className="
              border-t
              border-slate-200
              bg-slate-50
              px-3
              py-2
              lg:hidden
            "
            >
              <div
                className="
                flex
                gap-1.5
                overflow-x-auto
              "
              >
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => void sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-2.5
                        py-1.5
                        text-[9px]
                        font-semibold
                        text-slate-600
                        hover:border-indigo-200
                        hover:bg-indigo-50
                        hover:text-indigo-700
                        disabled:opacity-50
                      "
                    >
                      <Icon size={11} />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Input */}

            <div
              className="
              border-t
              border-slate-200
              bg-white
              p-3
              sm:p-4
            "
            >
              <form
                onSubmit={handleSubmit}
                className="
                  mx-auto
                  w-full
                  max-w-4xl
                "
              >
                <div
                  className="
                  flex
                  items-end
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-1.5
                  transition
                  focus-within:border-indigo-300
                  focus-within:bg-white
                  focus-within:ring-4
                  focus-within:ring-indigo-500/5
                "
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isLoading}
                    placeholder="Ask about attendance, timetable, exams, holidays or study plans..."
                    className="
                      min-h-10
                      max-h-32
                      flex-1
                      resize-none
                      bg-transparent
                      px-3
                      py-2.5
                      text-xs
                      font-medium
                      text-slate-900
                      outline-none
                      placeholder:text-slate-400
                      sm:text-sm
                    "
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className="
                      mb-0.5
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-indigo-600
                      text-white
                      shadow-md
                      shadow-indigo-500/20
                      transition
                      hover:bg-indigo-700
                      disabled:cursor-not-allowed
                      disabled:bg-slate-300
                      disabled:shadow-none
                    "
                  >
                    <Send size={15} strokeWidth={2} />
                  </button>
                </div>

                <div
                  className="
                  mt-2
                  flex
                  items-center
                  justify-between
                  px-1
                "
                >
                  <p
                    className="
                    text-[9px]
                    font-medium
                    text-slate-400
                  "
                  >
                    Press Enter to send · Shift + Enter for a new line
                  </p>

                  <div
                    className="
                    hidden
                    items-center
                    gap-1.5
                    sm:flex
                  "
                  >
                    <MessageCircle size={10} className="text-slate-400" />

                    <span
                      className="
                      text-[9px]
                      text-slate-400
                    "
                    >
                      Smart Campus AI
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AIPage
