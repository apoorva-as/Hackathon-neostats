import { PROJECT_ROLE_LABELS, ROLE_LABELS, STATUS_LABELS, initials } from '../utils/labels.js'

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ON_HOLD: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}
const STATUS_DOTS = {
  ACTIVE: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-sky-500',
  ARCHIVED: 'bg-slate-400',
}
const ROLE_STYLES = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  PROJECT_MANAGER: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  TEAM_MEMBER: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  VIEWER: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}
const AVATAR_COLORS = ['bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500']

const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export function StatusBadge({ status }) {
  return (
    <span className={`${base} ${STATUS_STYLES[status] ?? STATUS_STYLES.ARCHIVED}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? 'bg-slate-400'}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function RoleBadge({ role }) {
  return <span className={`${base} ${ROLE_STYLES[role] ?? ROLE_STYLES.VIEWER}`}>{ROLE_LABELS[role] ?? role}</span>
}

export function ProjectRoleBadge({ role }) {
  const style = role === 'VIEWER' ? ROLE_STYLES.VIEWER : ROLE_STYLES.TEAM_MEMBER
  return <span className={`${base} ${style}`}>{PROJECT_ROLE_LABELS[role] ?? role}</span>
}

export function Avatar({ name, id = 0, size = 'md' }) {
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizes[size]} ${AVATAR_COLORS[id % AVATAR_COLORS.length]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
