import { motion } from 'motion/react'
import { Link } from 'react-router'
import Icon from './Icon.jsx'
import { MockAvatars, MockTaskCard } from './landing/ProductPreview.jsx'
import Logo, { BRAND } from './Logo.jsx'

// Decorative workflow illustration for the auth pages: floating sample cards
// connected by lines. Sample content only.
function WorkflowIllustration() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-md" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" fill="none">
        <motion.path
          d="M90 70 C 180 70, 160 150, 250 150 S 330 240, 320 240"
          stroke="rgb(255 255 255 / 0.35)"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }}
        />
      </svg>

      <motion.div className="absolute left-0 top-6 w-52" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
        <div className="animate-float">
          <MockTaskCard title="Plan Q3 roadmap" tag="Strategy" priority="High" who="Ana Ruiz" className="shadow-2xl" />
        </div>
      </motion.div>

      <motion.div className="absolute right-0 top-[110px] w-56" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }}>
        <div className="animate-float-slow rounded-xl border border-white/20 bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-800">Website Redesign</span>
            <span className="text-[10px] font-semibold text-brand-600">72%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ delay: 0.9, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <MockAvatars names={['Mia Chen', 'Lea Novak', 'Sam Lee']} size="h-5 w-5 text-[8px]" />
            <span className="text-[9px] text-slate-400">8 of 11 tasks</span>
          </div>
        </div>
      </motion.div>

      <motion.div className="absolute bottom-2 left-12 w-48" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
        <div className="animate-float flex items-center gap-2.5 rounded-xl border border-white/20 bg-white p-3 shadow-2xl [animation-delay:1.5s]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-slate-800">Task completed</p>
            <p className="text-[10px] text-slate-400">Kick-off workshop</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Two-column layout for /login and /signup: brand panel left, form right.
export default function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,#2f2797,#4938e8_45%,#6d28d9)] bg-[length:200%_200%] p-10 text-white animate-gradient lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgb(255_255_255/0.4)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl" aria-hidden="true" />

        <Link to="/" className="relative w-fit" aria-label={`${BRAND.name} home`}>
          <Logo tone="light" />
        </Link>

        <div className="relative">
          <motion.h2
            className="max-w-md text-4xl font-bold leading-tight tracking-tight"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Great work starts with a clear workspace.
          </motion.h2>
          <motion.p
            className="mt-4 max-w-md text-base leading-7 text-brand-100"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Plan projects, organise tasks and keep everyone aligned, with the right access for every role.
          </motion.p>
          <div className="mt-10">
            <WorkflowIllustration />
          </div>
        </div>

        <p className="relative text-sm text-brand-200">{BRAND.tagline}</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link to="/" aria-label={`${BRAND.name} home`}>
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <motion.div
            className="w-full max-w-[420px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
        <p className="px-6 pb-6 text-center text-xs text-slate-400">
          <Link to="/privacy" className="hover:text-slate-600">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-slate-600">
            Terms of Service
          </Link>
        </p>
      </main>
    </div>
  )
}
