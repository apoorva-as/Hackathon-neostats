import { STATUS_DOTS, TASK_STATUS_DOTS } from '../utils/statusColors.js'
import { PRIORITY_LABELS, PROJECT_ROLE_LABELS, ROLE_LABELS, STATUS_LABELS, TASK_STATUS_LABELS, initials } from '../utils/labels.js'

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  ON_HOLD: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}
const ROLE_STYLES = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  PROJECT_MANAGER: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  TEAM_MEMBER: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  VIEWER: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}
const TASK_STATUS_STYLES = {
  TODO: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  IN_PROGRESS: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  DONE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
}
const PRIORITY_STYLES = {
  LOW: 'bg-slate-50 text-slate-600 ring-slate-500/15',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  HIGH: 'bg-red-50 text-red-700 ring-red-600/15',
}
// Small bar glyph: 1, 2 or 3 bars filled for low / medium / high.
const PRIORITY_LEVEL = { LOW: 1, MEDIUM: 2, HIGH: 3 }
const AVATAR_COLORS = [
  'bg-brand-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
]

const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export function StatusBadge({ status }) {
  return (
    <span className={`${base} ${STATUS_STYLES[status] ?? STATUS_STYLES.ARCHIVED}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? 'bg-slate-400'}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function TaskStatusBadge({ status }) {
  return (
    <span className={`${base} ${TASK_STATUS_STYLES[status] ?? TASK_STATUS_STYLES.TODO}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TASK_STATUS_DOTS[status] ?? 'bg-slate-400'}`} />
      {TASK_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const level = PRIORITY_LEVEL[priority] ?? 1
  return (
    <span className={`${base} ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.LOW}`}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={`w-[3px] rounded-sm bg-current ${bar <= level ? '' : 'opacity-25'}`} style={{ height: 3 + bar * 2 }} />
        ))}
      </span>
      {PRIORITY_LABELS[priority] ?? priority}
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

const AVATAR_SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm', xl: 'h-14 w-14 text-base' }

export function Avatar({ name, id = 0, size = 'md', ring = false, title }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${AVATAR_SIZES[size]} ${AVATAR_COLORS[id % AVATAR_COLORS.length]} ${ring ? 'ring-2 ring-white' : ''}`}
      title={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {initials(name)}
    </span>
  )
}

// Overlapping avatars with a "+N" chip. `people` = [{ id, name }].
export function AvatarStack({ people, max = 4, size = 'xs' }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <span className="flex -space-x-1.5">
      {shown.map((person) => (
        <Avatar key={person.id} name={person.name} id={person.id} size={size} ring title={person.name} />
      ))}
      {extra > 0 && (
        <span className={`inline-flex items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600 ring-2 ring-white ${AVATAR_SIZES[size]}`}>
          +{extra}
        </span>
      )}
    </span>
  )
}
