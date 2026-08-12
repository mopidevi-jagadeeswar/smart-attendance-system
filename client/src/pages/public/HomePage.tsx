import { ArrowRight, BarChart3, ScanFace, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import PublicNavbar from '../../components/navigation/PublicNavbar'

function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-950 font-sans text-white antialiased">
      {/* =========================================================
          ANIMATIONS
      ========================================================== */}

      <style>{`
        @keyframes scanSweep {
          0% {
            transform: translateY(-90px);
            opacity: 0;
          }

          15% {
            opacity: 1;
          }

          50% {
            opacity: 1;
          }

          85% {
            opacity: 1;
          }

          100% {
            transform: translateY(90px);
            opacity: 0;
          }
        }

        @keyframes softPulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }

          50% {
            opacity: 0.65;
            transform: scale(1.05);
          }
        }

        @keyframes floatNode {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        .scan-sweep {
          animation: scanSweep 2.8s ease-in-out infinite;
        }

        .soft-pulse {
          animation: softPulse 4s ease-in-out infinite;
        }

        .float-node {
          animation: floatNode 3s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .scan-sweep,
          .soft-pulse,
          .float-node,
          .animate-spin,
          .animate-ping,
          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* =========================================================
          NAVBAR
      ========================================================== */}

      <PublicNavbar />

      {/* =========================================================
          HERO
      ========================================================== */}

      <main>
        <section className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden">
          {/* =====================================================
              BACKGROUND
          ====================================================== */}

          <div className="pointer-events-none absolute inset-0">
            <div
              className="
                absolute left-[5%] top-[25%]
                h-95 w-95
                rounded-full
                bg-red-600/5.5
                blur-[130px]
              "
            />

            <div
              className="
                absolute right-[8%] top-[15%]
                h-130 w-130
                rounded-full
                bg-red-500/4.5
                blur-[150px]
              "
            />

            <div
              className="
                absolute bottom-0 left-1/2
                h-65 w-125
                -translate-x-1/2
                rounded-full
                bg-rose-500/2.5
                blur-[120px]
              "
            />

            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '70px 70px',
              }}
            />
          </div>

          {/* =====================================================
              CONTENT
          ====================================================== */}

          <div
            className="
              relative mx-auto grid w-full max-w-7xl
              items-center gap-10
              px-6 py-12
              sm:px-8
              lg:grid-cols-[1fr_0.95fr]
              lg:px-10 lg:py-14
            "
          >
            {/* ===================================================
                LEFT
            ==================================================== */}

            <div className="relative z-10">
              {/* Heading */}

              <h1
                className="
                  text-4xl font-extrabold
                  leading-[1.02]
                  tracking-[-0.03em]
                  text-white
                  sm:text-5xl
                  lg:text-[4.2rem]
                "
              >
                Smart Attendance
              </h1>

              <h1
                className="
                  mt-1 text-4xl font-extrabold
                  leading-[1.02]
                  tracking-[-0.03em]
                  sm:text-5xl
                  lg:text-[4.2rem]
                "
              >
                <span
                  className="
                    bg-linear-to-r
                    from-red-500
                    via-rose-400
                    to-amber-400
                    bg-clip-text
                    text-transparent
                  "
                >
                  System
                </span>
              </h1>

              {/* Technology line */}

              <div
                className="
                  mt-5 flex flex-wrap
                  items-center
                  gap-x-3 gap-y-2
                  text-xs font-semibold
                "
              >
                <span className="flex items-center gap-1.5 text-red-400">
                  <ScanFace size={14} />
                  Face Recognition
                </span>

                <span className="text-slate-700">•</span>

                <span className="flex items-center gap-1.5 text-amber-400">
                  <Smartphone size={14} />
                  NFC
                </span>

                <span className="text-slate-700">•</span>

                <span className="flex items-center gap-1.5 text-rose-400">
                  <BarChart3 size={14} />
                  Behavioral Analytics
                </span>
              </div>

              {/* Description */}

              <p
                className="
                  mt-5 max-w-xl
                  text-sm leading-7
                  text-slate-400
                  sm:text-[15px]
                "
              >
                Smart attendance powered by face recognition, NFC authentication, and real-time
                verification.
              </p>

              {/* =================================================
                  FEATURES
              ================================================== */}

              <div
                className="
                  mt-7 grid max-w-xl
                  grid-cols-1 gap-2.5
                  sm:grid-cols-3
                "
              >
                {/* Face */}

                <div
                  className="
                    group rounded-xl
                    border border-white/7
                    bg-white/2
                    px-3.5 py-3
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:border-red-500/30
                    hover:bg-red-500/3.5
                  "
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-lg
                        bg-red-500/10
                      "
                    >
                      <ScanFace size={16} strokeWidth={1.8} className="text-red-400" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-200">Face Recognition</p>

                      <p className="mt-0.5 text-[8px] text-slate-600">Secure verification</p>
                    </div>
                  </div>
                </div>

                {/* NFC */}

                <div
                  className="
                    group rounded-xl
                    border border-white/7
                    bg-white/2
                    px-3.5 py-3
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:border-amber-500/30
                    hover:bg-amber-500/3.5
                  "
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-lg
                        bg-amber-500/10
                      "
                    >
                      <Smartphone size={16} strokeWidth={1.8} className="text-amber-400" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-200">NFC Attendance</p>

                      <p className="mt-0.5 text-[8px] text-slate-600">Fast authentication</p>
                    </div>
                  </div>
                </div>

                {/* Analytics */}

                <div
                  className="
                    group rounded-xl
                    border border-white/7
                    bg-white/2
                    px-3.5 py-3
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:border-rose-500/30
                    hover:bg-rose-500/3.5
                  "
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="
                        flex h-8 w-8
                        items-center justify-center
                        rounded-lg
                        bg-rose-500/10
                      "
                    >
                      <BarChart3 size={16} strokeWidth={1.8} className="text-rose-400" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-200">Smart Analytics</p>

                      <p className="mt-0.5 text-[8px] text-slate-600">Attendance insights</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
                  BUTTONS
              ================================================== */}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/attendance"
                  className="
                    group inline-flex
                    items-center gap-3
                    rounded-xl
                    bg-red-600
                    px-6 py-3.5
                    text-sm font-semibold
                    text-white
                    shadow-lg
                    shadow-red-600/20
                    transition-all duration-300
                    hover:-translate-y-0.5
                    hover:bg-red-500
                    hover:shadow-red-500/30
                    active:scale-[0.98]
                  "
                >
                  Start Attendance
                  <ArrowRight
                    size={16}
                    className="
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </Link>

                <Link
                  to="/login"
                  className="
                    group inline-flex
                    items-center gap-3
                    rounded-xl
                    border border-white/10
                    bg-white/2.5
                    px-6 py-3.5
                    text-sm font-semibold
                    text-slate-300
                    transition-all duration-300
                    hover:-translate-y-0.5
                    hover:border-red-500/30
                    hover:bg-red-500/5
                    hover:text-white
                    active:scale-[0.98]
                  "
                >
                  Login
                  <ArrowRight
                    size={16}
                    className="
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </Link>
              </div>

              {/* Security line */}

              <div
                className="
                  mt-6 flex items-center
                  gap-2 text-[9px]
                  text-slate-600
                "
              >
                <ShieldCheck size={13} className="text-emerald-500/70" />
                Secure biometric verification
                <span className="text-slate-800">•</span>
                Real-time attendance
              </div>
            </div>

            {/* ===================================================
                RIGHT BIOMETRIC GRAPHIC
            ==================================================== */}

            <div className="relative flex justify-center lg:justify-end">
              <div
                className="
                  relative flex
                  h-97.5 w-97.5
                  items-center justify-center
                  sm:h-117.5 sm:w-117.5
                "
              >
                {/* Glow */}

                <div
                  className="
                    soft-pulse absolute
                    h-64 w-64
                    rounded-full
                    bg-red-600/15
                    blur-[100px]
                  "
                />

                <div
                  className="
                    absolute
                    h-92.5 w-92.5
                    rounded-full
                    bg-red-500/2.5
                    blur-[90px]
                  "
                />

                {/* Outer ring */}

                <div
                  className="
                    absolute inset-3
                    rounded-full
                    border border-red-500/15
                    animate-spin
                  "
                  style={{
                    animationDuration: '18s',
                  }}
                >
                  <div
                    className="
                      absolute left-1/2 top-0
                      h-14 w-px
                      -translate-x-1/2
                      bg-linear-to-b
                      from-red-400/80
                      to-transparent
                    "
                  />

                  <div
                    className="
                      absolute bottom-10 right-14
                      h-1.5 w-1.5
                      rounded-full
                      bg-red-400
                      shadow-[0_0_12px_rgba(248,113,113,1)]
                    "
                  />
                </div>

                {/* Second ring */}

                <div
                  className="
                    absolute inset-10
                    rounded-full
                    border-2
                    border-transparent
                    border-t-red-500
                    border-r-red-500/25
                    animate-spin
                  "
                  style={{
                    animationDuration: '9s',
                    animationDirection: 'reverse',
                  }}
                />

                {/* Dashed ring */}

                <div
                  className="
                    absolute inset-18
                    rounded-full
                    border border-dashed
                    border-red-500/25
                    animate-spin
                  "
                  style={{
                    animationDuration: '25s',
                  }}
                />

                {/* Orbit */}

                <div
                  className="absolute inset-0 animate-spin"
                  style={{
                    animationDuration: '7s',
                  }}
                >
                  <span
                    className="
                      absolute left-1/2 top-0
                      h-2.5 w-2.5
                      -translate-x-1/2
                      rounded-full
                      bg-red-400
                      shadow-[0_0_16px_rgba(248,113,113,1)]
                    "
                  />
                </div>

                {/* =================================================
                    CENTER
                ================================================== */}

                <div
                  className="
                    absolute left-1/2 top-1/2
                    flex h-67.5 w-67.5
                    -translate-x-1/2
                    -translate-y-1/2
                    items-center justify-center
                    rounded-full
                    border border-red-500/15
                    bg-neutral-950/80
                    shadow-[0_0_70px_rgba(239,68,68,0.1)]
                    backdrop-blur-xl
                  "
                >
                  {/* Inner rings */}

                  <div
                    className="
                      absolute inset-5
                      rounded-full
                      border border-white/4
                    "
                  />

                  <div
                    className="
                      absolute inset-9
                      rounded-full
                      border border-red-500/10
                    "
                  />

                  {/* Crosshair */}

                  <div
                    className="
                      absolute left-6 top-1/2
                      h-px w-6
                      bg-red-500/35
                    "
                  />

                  <div
                    className="
                      absolute right-6 top-1/2
                      h-px w-6
                      bg-red-500/35
                    "
                  />

                  <div
                    className="
                      absolute left-1/2 top-6
                      h-6 w-px
                      bg-red-500/35
                    "
                  />

                  <div
                    className="
                      absolute bottom-6 left-1/2
                      h-6 w-px
                      bg-red-500/35
                    "
                  />

                  {/* Face scanner */}

                  <div
                    className="
                      relative flex
                      h-38.75 w-38.75
                      items-center justify-center
                    "
                  >
                    <div
                      className="
                        absolute inset-0
                        rounded-3xl
                        bg-red-500/10
                        blur-2xl
                      "
                    />

                    <div
                      className="
                        relative flex
                        h-full w-full
                        items-center justify-center
                        rounded-4xl
                        border border-red-500/25
                        bg-neutral-900/90
                        shadow-2xl
                        backdrop-blur-md
                      "
                    >
                      {/* Scanner brackets */}

                      <span
                        className="
                          absolute left-3 top-3
                          h-5 w-5
                          border-l-2
                          border-t-2
                          border-red-400
                        "
                      />

                      <span
                        className="
                          absolute right-3 top-3
                          h-5 w-5
                          border-r-2
                          border-t-2
                          border-red-400
                        "
                      />

                      <span
                        className="
                          absolute bottom-3 left-3
                          h-5 w-5
                          border-b-2
                          border-l-2
                          border-red-400
                        "
                      />

                      <span
                        className="
                          absolute bottom-3 right-3
                          h-5 w-5
                          border-b-2
                          border-r-2
                          border-red-400
                        "
                      />

                      {/* Face */}

                      <div
                        className="
                          relative flex
                          h-20 w-20
                          items-center justify-center
                          rounded-full
                          border border-red-500/15
                          bg-red-500/4
                        "
                      >
                        <div
                          className="
                            absolute inset-2
                            rounded-full
                            border border-red-400/10
                          "
                        />

                        <UserRound
                          size={42}
                          strokeWidth={1.4}
                          className="
                            text-red-400
                            drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]
                          "
                        />
                      </div>

                      {/* Scan line */}

                      <div
                        className="
                          scan-sweep absolute
                          inset-x-3 z-20
                          h-0.5
                          bg-red-400
                          shadow-[0_0_12px_rgba(248,113,113,1),0_0_25px_rgba(239,68,68,0.9)]
                        "
                      />

                      <div
                        className="
                          scan-sweep absolute
                          inset-x-3 z-10
                          h-10
                          bg-linear-to-b
                          from-transparent
                          via-red-500/15
                          to-transparent
                        "
                      />
                    </div>
                  </div>
                </div>

                {/* =================================================
                    CORNER MARKS
                ================================================== */}

                <div
                  className="
                    absolute left-10 top-10
                    h-6 w-6
                    border-l border-t
                    border-red-500/35
                  "
                />

                <div
                  className="
                    absolute right-10 top-10
                    h-6 w-6
                    border-r border-t
                    border-red-500/35
                  "
                />

                <div
                  className="
                    absolute bottom-10 left-10
                    h-6 w-6
                    border-b border-l
                    border-red-500/35
                  "
                />

                <div
                  className="
                    absolute bottom-10 right-10
                    h-6 w-6
                    border-b border-r
                    border-red-500/35
                  "
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
