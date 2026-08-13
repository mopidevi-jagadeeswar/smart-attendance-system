import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

/* ============================================================
   TYPES
============================================================ */

type ModelState = 'ready' | 'training' | 'error' | 'not_trained' | 'unknown'

interface ModelStatus {
  status: ModelState
  model_name: string
  model_version: string
  training_samples: number
  registered_users: number
  last_trained_at: string | null
  accuracy: number | null
  embedding_dimension: number | null
  recognition_enabled: boolean
}

/* ============================================================
   DEFAULT DATA
============================================================ */

const DEFAULT_STATUS: ModelStatus = {
  status: 'unknown',
  model_name: 'Face Recognition',
  model_version: '—',
  training_samples: 0,
  registered_users: 0,
  last_trained_at: null,
  accuracy: null,
  embedding_dimension: null,
  recognition_enabled: false,
}

/* ============================================================
   PAGE
============================================================ */

function ModelStatusPage() {
  const [model, setModel] = useState<ModelStatus>(DEFAULT_STATUS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  /* ==========================================================
     FETCH DATA (Pure async function, no state setters here)
  ========================================================== */

  const fetchModelStatusData = async (): Promise<ModelStatus> => {
    // Artificial network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Connect your existing FastAPI backend route here.
    // e.g., const response = await fetch('/api/model-status')
    // if (!response.ok) throw new Error('Failed to fetch')
    // return await response.json()

    return DEFAULT_STATUS
  }

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    // Chain the promise so ESLint strictly sees the state
    // updates as asynchronous callbacks.
    fetchModelStatusData()
      .then((data) => {
        setModel(data)
        setError('')
      })
      .catch((err) => {
        console.error('Failed to load model status:', err)
        setError('Unable to load model status.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const data = await fetchModelStatusData()
      setModel(data)
      setError('')
    } catch (err) {
      console.error('Failed to refresh model status:', err)
      setError('Unable to load model status.')
    } finally {
      setRefreshing(false)
    }
  }

  /* ==========================================================
     STATUS INFORMATION
  ========================================================== */

  const statusInfo = getStatusInformation(model.status)

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-slate-100">
        <RainbowBackground />

        <div className="relative z-10 rounded-2xl border border-white/80 bg-white/70 px-10 py-8 text-center shadow-xl backdrop-blur-2xl">
          <RefreshCw size={30} className="mx-auto animate-spin text-indigo-600" />

          <p className="mt-4 text-sm font-black text-slate-900">Loading model status</p>

          <p className="mt-1 text-xs text-slate-500">Checking recognition system...</p>
        </div>
      </div>
    )
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8 lg:py-7">
      <RainbowBackground />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Face Recognition
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Model Status</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Monitor the current state, training information, and availability of the face
              recognition model.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleRefresh()
            }}
            disabled={refreshing}
            className="flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-white/75 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'animate-spin text-indigo-600' : 'text-indigo-600'}
            />
            Refresh Status
          </button>
        </div>

        {/* ====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs font-semibold text-red-700 shadow-sm backdrop-blur-xl">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {/* ====================================================
            MAIN STATUS
        ===================================================== */}

        <section className="mt-7 rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${statusInfo.iconBackground} ${statusInfo.iconColor}`}
              >
                {statusInfo.icon}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Current Model Status
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">{statusInfo.title}</h2>

                <p className="mt-1 text-xs text-slate-500">{statusInfo.description}</p>
              </div>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-xs font-black ${statusInfo.badgeClass}`}
            >
              {statusInfo.badge}
            </div>
          </div>
        </section>

        {/* ====================================================
            STAT CARDS
        ===================================================== */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Database size={19} />}
            title="Training Samples"
            value={String(model.training_samples)}
            description="Face samples available"
            iconClass="bg-purple-50 text-purple-600"
          />

          <StatCard
            icon={<Users size={19} />}
            title="Registered Users"
            value={String(model.registered_users)}
            description="Users with face data"
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={<Activity size={19} />}
            title="Accuracy"
            value={model.accuracy !== null ? `${model.accuracy.toFixed(1)}%` : '—'}
            description="Model validation accuracy"
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            icon={<ShieldCheck size={19} />}
            title="Recognition"
            value={model.recognition_enabled ? 'Active' : 'Inactive'}
            description="Live verification service"
            iconClass={
              model.recognition_enabled
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-500'
            }
          />
        </section>

        {/* ====================================================
            MODEL INFORMATION
        ===================================================== */}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* MODEL DETAILS */}

          <div className="rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BrainCircuit size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">Model Information</h2>

                <p className="text-[10px] text-slate-500">Recognition model configuration</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <InfoRow label="Model Name" value={model.model_name} />

              <InfoRow label="Model Version" value={model.model_version} />

              <InfoRow
                label="Embedding Dimension"
                value={model.embedding_dimension !== null ? String(model.embedding_dimension) : '—'}
              />

              <InfoRow
                label="Last Trained"
                value={model.last_trained_at ? formatDateTime(model.last_trained_at) : 'Never'}
              />

              <InfoRow
                label="Recognition Service"
                value={model.recognition_enabled ? 'Enabled' : 'Disabled'}
              />
            </div>
          </div>

          {/* HEALTH */}

          <div className="rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">Recognition Health</h2>

                <p className="text-[10px] text-slate-500">Current system readiness</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <HealthRow label="Model available" active={model.status === 'ready'} />

              <HealthRow label="Face recognition" active={model.recognition_enabled} />

              <HealthRow label="Training data" active={model.training_samples > 0} />

              <HealthRow label="Registered users" active={model.registered_users > 0} />
            </div>

            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                System Information
              </p>

              <p className="mt-2 text-xs leading-5 text-indigo-800">
                Model status should be checked after training or when new face data is registered.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            TRAINING STATUS
        ===================================================== */}

        <section className="mt-5 rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BrainCircuit size={19} />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-950">Training Status</h2>

              <p className="text-[10px] text-slate-500">Current model training state</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Training progress</span>

              <span className="text-xs font-black text-indigo-600">
                {model.status === 'training'
                  ? 'In progress'
                  : model.status === 'ready'
                    ? 'Complete'
                    : 'Not started'}
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  model.status === 'ready'
                    ? 'w-full bg-linear-to-r from-emerald-400 via-indigo-500 to-cyan-400'
                    : model.status === 'training'
                      ? 'w-1/2 bg-linear-to-r from-indigo-400 to-purple-500'
                      : 'w-0'
                }`}
              />
            </div>
          </div>
        </section>

        {/* ====================================================
            MODEL STATUS LEGEND
        ===================================================== */}

        <section className="mt-5 rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <h2 className="text-base font-black text-slate-950">Status Guide</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusGuide
              icon={<CheckCircle2 size={16} />}
              title="Ready"
              description="Model is trained and available."
              className="text-emerald-600 bg-emerald-50"
            />

            <StatusGuide
              icon={<RefreshCw size={16} />}
              title="Training"
              description="Model training is currently running."
              className="text-indigo-600 bg-indigo-50"
            />

            <StatusGuide
              icon={<AlertCircle size={16} />}
              title="Not Trained"
              description="No trained model is currently available."
              className="text-amber-600 bg-amber-50"
            />

            <StatusGuide
              icon={<XCircle size={16} />}
              title="Error"
              description="The recognition model has an error."
              className="text-red-600 bg-red-50"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

/* ============================================================
   RAINBOW BACKGROUND
============================================================ */

function RainbowBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />
      <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />
      <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />
    </div>
  )
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  icon,
  title,
  value,
  description,
  iconClass,
}: {
  icon: React.ReactNode
  title: string
  value: string
  description: string
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-[10px] text-slate-500">{description}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-900">{value}</span>
    </div>
  )
}

/* ============================================================
   HEALTH ROW
============================================================ */

function HealthRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/60 px-4 py-3">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {active ? (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
          <CheckCircle2 size={14} />
          Healthy
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <XCircle size={14} />
          Inactive
        </span>
      )}
    </div>
  )
}

/* ============================================================
   STATUS GUIDE
============================================================ */

function StatusGuide({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode
  title: string
  description: string
  className: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/60 p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${className}`}>
        {icon}
      </div>
      <h3 className="mt-3 text-xs font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-[10px] leading-5 text-slate-500">{description}</p>
    </div>
  )
}

/* ============================================================
   STATUS INFORMATION
============================================================ */

function getStatusInformation(status: ModelState) {
  switch (status) {
    case 'ready':
      return {
        title: 'Model Ready',
        description: 'The face recognition model is trained and available.',
        badge: 'READY',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: <CheckCircle2 size={25} />,
        iconBackground: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      }
    case 'training':
      return {
        title: 'Training in Progress',
        description: 'The recognition model is currently being trained.',
        badge: 'TRAINING',
        badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        icon: <RefreshCw size={25} />,
        iconBackground: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
      }
    case 'error':
      return {
        title: 'Model Error',
        description: 'The recognition model requires attention.',
        badge: 'ERROR',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        icon: <XCircle size={25} />,
        iconBackground: 'bg-red-50',
        iconColor: 'text-red-600',
      }
    case 'not_trained':
      return {
        title: 'Model Not Trained',
        description: 'No trained recognition model is currently available.',
        badge: 'NOT TRAINED',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: <AlertCircle size={25} />,
        iconBackground: 'bg-amber-50',
        iconColor: 'text-amber-600',
      }
    default:
      return {
        title: 'Status Unavailable',
        description: 'The current model status could not be determined.',
        badge: 'UNKNOWN',
        badgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
        icon: <AlertCircle size={25} />,
        iconBackground: 'bg-slate-100',
        iconColor: 'text-slate-500',
      }
  }
}

/* ============================================================
   DATE FORMAT
============================================================ */

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default ModelStatusPage
