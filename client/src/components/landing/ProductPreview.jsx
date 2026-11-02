import { motion } from 'motion/react'
import { initials } from '../../utils/labels.js'
import Icon from '../Icon.jsx'
import { LogoMark } from '../Logo.jsx'

// Static, illustrative mock-ups of the WORKSPHERE interface for the marketing
// pages. They use sample content only and never touch the API.

const AVATAR_BG = ['bg-brand-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500']

function MockAvatar({ name, i = 0, size = 'h-6 w-6 text-[9px]' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${size} ${AVATAR_BG[i % AVATAR_BG.length]}`}>
      {initials(name)}
    </span>
  )
}

export function MockAvatars({ names, size }) {
  return (
    <span className="flex -space-x-1.5">
      {names.map((n, i) => (
        <MockAvatar key={n} name={n} i={i} size={size} />
      ))}
    </span>
  )
}

const PRIORITY = {
  High: 'bg-red-50 text-red-600',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-500',
}

export function MockTaskCard({ title, tag, priority = 'Medium', who = 'Sam Lee', i = 0, progress, className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY[priority]}`}>{priority}</span>
        <span className="truncate text-[9px] font-medium text-slate-400">{tag}</span>
      </div>
      <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-800">{title}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <Icon name="calendar" className="h-2.5 w-2.5" /> Nov {12 + i}
        </span>
        <MockAvatar name={who} i={i} size="h-5 w-5 text-[8px]" />
      </div>
    </div>
  )
}

const COLUMNS = [
  {
    title: 'To do',
    dot: 'bg-slate-400',
    cards: [
      { title: 'Define launch checklist', tag: 'Mobile App', priority: 'High', who: 'Ana Ruiz' },
      { title: 'Audit onboarding emails', tag: 'Growth', priority: 'Low', who: 'Tom Hall' },
    ],
  },
  {
    title: 'In progress',
    dot: 'bg-brand-500',
    cards: [
      { title: 'Homepage hero redesign', tag: 'Website', priority: 'Medium', who: 'Mia Chen', progress: 64 },
      { title: 'Migrate reporting tables', tag: 'Data', priority: 'High', who: 'Raj Patel', progress: 38 },
    ],
  },
  {
    title: 'Done',
    dot: 'bg-emerald-500',
    cards: [{ title: 'Kick-off workshop', tag: 'Website', priority: 'Low', who: 'Lea Novak' }],
  },
]

export function MockBoard({ compact = false }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {COLUMNS.map((col, c) => (
        <div key={col.title} className="rounded-xl bg-slate-50 p-2">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
            <span className="text-[10px] font-semibold text-slate-600">{col.title}</span>
            <span className="ml-auto text-[9px] text-slate-400">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {(compact ? col.cards.slice(0, 1) : col.cards).map((card, i) => (
              <MockTaskCard key={card.title} {...card} i={c * 2 + i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const PROJECTS = [
  { name: 'Website Redesign', pct: 72, status: 'Active', color: 'bg-emerald-500', team: ['Mia Chen', 'Lea Novak', 'Sam Lee'] },
  { name: 'Mobile App Launch', pct: 45, status: 'Active', color: 'bg-emerald-500', team: ['Ana Ruiz', 'Tom Hall'] },
  { name: 'Data Platform', pct: 28, status: 'On hold', color: 'bg-amber-500', team: ['Raj Patel', 'Ivy Ross', 'Ben Fox'] },
]

export function MockProjectCard({ project, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Icon name="folder" className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-semibold text-slate-800">{project.name}</span>
        </span>
        <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${project.color}`} />
          {project.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[9px] text-slate-400">
        <span>Progress</span>
        <span className="font-semibold text-slate-700">{project.pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${project.pct}%` }} />
      </div>
      <div className="mt-2.5">
        <MockAvatars names={project.team} size="h-5 w-5 text-[8px]" />
      </div>
    </div>
  )
}

export function MockProjects() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {PROJECTS.map((p) => (
        <MockProjectCard key={p.name} project={p} />
      ))}
    </div>
  )
}

const BARS = [38, 52, 44, 66, 58, 74, 82]

export function MockChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-700">Tasks completed</span>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">This week</span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-1.5">
        {BARS.map((h, i) => (
          <motion.div
            key={i}
            className={`flex-1 rounded-t ${i === BARS.length - 1 ? 'bg-brand-500' : 'bg-brand-200'}`}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.8, delay: 0.6 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-slate-400">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

const SIDEBAR = [
  { icon: 'dashboard', label: 'Dashboard', active: true },
  { icon: 'projects', label: 'Projects' },
  { icon: 'tasks', label: 'My tasks' },
  { icon: 'users', label: 'Team' },
]

const STATS = [
  { label: 'Active projects', value: '12', icon: 'projects', tone: 'bg-brand-50 text-brand-600' },
  { label: 'Open tasks', value: '48', icon: 'tasks', tone: 'bg-sky-50 text-sky-600' },
  { label: 'Completed', value: '136', icon: 'check-circle', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Overdue', value: '3', icon: 'clock', tone: 'bg-red-50 text-red-500' },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
}
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

// The big hero mock-up: a browser window showing the WORKSPHERE dashboard.
export default function ProductPreview() {
  return (
    <div className="relative" role="img" aria-label="Illustration of the WORKSPHERE dashboard with projects, a task board and progress charts">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_40px_100px_-30px_rgb(49_39_151/0.35)] ring-1 ring-black/5">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="mx-auto hidden w-64 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-1 text-[10px] text-slate-400 ring-1 ring-slate-200 sm:flex">
            <Icon name="lock" className="h-2.5 w-2.5" /> app.worksphere.io/dashboard
          </span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-40 shrink-0 border-r border-slate-100 p-3 md:block">
            <div className="flex items-center gap-1.5">
              <LogoMark className="h-5 w-5" />
              <span className="text-[10px] font-extrabold tracking-[0.12em] text-slate-800">WORKSPHERE</span>
            </div>
            <div className="mt-4 space-y-0.5">
              {SIDEBAR.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-medium ${item.active ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`}
                >
                  <Icon name={item.icon} className="h-3 w-3" />
                  {item.label}
                </div>
              ))}
            </div>
            <p className="mt-5 px-2 text-[8px] font-semibold uppercase tracking-wider text-slate-400">Projects</p>
            {['Website Redesign', 'Mobile App', 'Data Platform'].map((p, i) => (
              <div key={p} className="mt-1 flex items-center gap-2 px-2 py-1 text-[10px] text-slate-500">
                <span className={`h-1.5 w-1.5 rounded-sm ${['bg-brand-500', 'bg-teal-500', 'bg-amber-500'][i]}`} />
                {p}
              </div>
            ))}
          </div>

          {/* Main */}
          <motion.div className="min-w-0 flex-1 space-y-3 bg-slate-50/40 p-3 sm:p-4" variants={stagger} initial="hidden" animate="show">
            <motion.div variants={rise} className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-slate-900">Welcome back, Jordan</p>
                <p className="text-[9px] text-slate-400">Here&apos;s what&apos;s happening across your workspace.</p>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[9px] font-semibold text-white">
                <Icon name="plus" className="h-2.5 w-2.5" /> New project
              </span>
            </motion.div>

            <motion.div variants={rise} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500">{s.label}</span>
                    <span className={`flex h-4 w-4 items-center justify-center rounded ${s.tone}`}>
                      <Icon name={s.icon} className="h-2.5 w-2.5" />
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">{s.value}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={rise}>
              <MockProjects />
            </motion.div>

            <motion.div variants={rise} className="grid gap-2.5 lg:grid-cols-[1fr_180px]">
              <MockBoard compact />
              <div className="hidden lg:block">
                <MockChart />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
