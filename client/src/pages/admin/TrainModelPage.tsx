import {
  BrainCircuit,
  CheckCircle2,
  Database,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'

function TrainModelPage() {
  const [training, setTraining] = useState(false)
  const [message, setMessage] = useState('')

  const handleTrainModel = async () => {
    setTraining(true)
    setMessage('')

    /*
     * Backend training endpoint will be connected here.
     *
     * We are intentionally not inventing an endpoint yet.
     * Once we check your existing face_service.py / face.py,
     * this button will call the correct FastAPI endpoint.
     */

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))

      setMessage('Training endpoint is ready to be connected.')
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8 lg:py-7">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Face Recognition
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Train Model</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Train and maintain the face recognition model using registered student and faculty
              face data.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-4 py-2.5 shadow-sm backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            <span className="text-xs font-bold text-emerald-700">System Ready</span>
          </div>
        </div>

        {/* ===================================================
            STAT CARDS
        ==================================================== */}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users size={19} />}
            title="Registered Users"
            value="—"
            description="Students and faculty"
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={<Database size={19} />}
            title="Face Samples"
            value="—"
            description="Available training data"
            iconClass="bg-purple-50 text-purple-600"
          />

          <StatCard
            icon={<BrainCircuit size={19} />}
            title="Model Status"
            value="Ready"
            description="Recognition system"
            iconClass="bg-indigo-50 text-indigo-600"
          />

          <StatCard
            icon={<ShieldCheck size={19} />}
            title="Verification"
            value="Active"
            description="Face verification enabled"
            iconClass="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* ===================================================
            MAIN TRAINING CARD
        ==================================================== */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          {/* TRAINING PANEL */}

          <section className="rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BrainCircuit size={21} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">Recognition Model</h2>

                    <p className="mt-0.5 text-xs text-slate-500">Face embedding training</p>
                  </div>
                </div>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
                Ready
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
              <h3 className="text-sm font-black text-slate-900">Before training</h3>

              <ul className="mt-4 space-y-3">
                <TrainingStep completed text="Registered users have face data" />

                <TrainingStep completed text="Face embeddings are available" />

                <TrainingStep text="Build recognition index" />

                <TrainingStep text="Validate recognition model" />
              </ul>
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleTrainModel}
                disabled={training}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {training ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play size={17} />
                    Train Recognition Model
                  </>
                )}
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-white"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </section>

          {/* MODEL INFORMATION */}

          <section className="rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">Model Information</h2>

                <p className="text-[10px] text-slate-500">Current recognition configuration</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <InfoRow label="Model" value="Face Recognition" />

              <InfoRow label="Embedding" value="PostgreSQL" />

              <InfoRow label="Recognition" value="Active" />

              <InfoRow label="Last Training" value="—" />

              <InfoRow label="Training Samples" value="—" />
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Important
              </p>

              <p className="mt-2 text-xs leading-5 text-amber-800">
                Register sufficient face samples before training the recognition model. Adding new
                users may require retraining.
              </p>
            </div>
          </section>
        </div>

        {/* ===================================================
            PROCESS INFORMATION
        ==================================================== */}

        <section className="mt-5 rounded-2xl border border-white/80 bg-white/65 p-6 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
          <h2 className="text-base font-black text-slate-950">Training Pipeline</h2>

          <p className="mt-1 text-xs text-slate-500">
            How the face recognition training process works.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <PipelineCard
              number="01"
              title="Collect"
              description="Load registered face embeddings."
            />

            <PipelineCard
              number="02"
              title="Prepare"
              description="Validate and prepare embedding data."
            />

            <PipelineCard number="03" title="Train" description="Build the recognition index." />

            <PipelineCard number="04" title="Validate" description="Verify model readiness." />
          </div>
        </section>
      </div>
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
    <div className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-[0_14px_45px_rgba(71,85,105,0.08)] backdrop-blur-2xl">
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
   TRAINING STEP
============================================================ */

function TrainingStep({ completed = false, text }: { completed?: boolean; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          completed ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'
        }`}
      >
        {completed ? (
          <CheckCircle2 size={14} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </span>

      <span className="text-xs font-semibold text-slate-700">{text}</span>
    </li>
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
   PIPELINE CARD
============================================================ */

function PipelineCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
      <span className="text-[10px] font-black tracking-widest text-indigo-500">{number}</span>

      <h3 className="mt-2 text-sm font-black text-slate-900">{title}</h3>

      <p className="mt-1 text-[10px] leading-5 text-slate-500">{description}</p>
    </div>
  )
}

export default TrainModelPage
