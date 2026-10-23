// Display labels and helpers shared by the UI. Pure functions (unit tested).

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_MEMBER: 'Team Member',
  VIEWER: 'Viewer',
}

export const ROLE_ORDER = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']

export const STATUS_LABELS = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export const PROJECT_STATUSES = Object.keys(STATUS_LABELS)

export const TASK_STATUS_LABELS = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
}
export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS)

export const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}
export const TASK_PRIORITIES = Object.keys(PRIORITY_LABELS)

export const PROJECT_ROLE_LABELS = {
  MEMBER: 'Member',
  VIEWER: 'Read-only',
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Due dates are calendar dates ("YYYY-MM-DD"); format them in UTC so the day
// never shifts with the browser's time zone.
export function formatDueDate(value) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// True when an unfinished task's due date is before `today` ("YYYY-MM-DD").
export function isOverdue(task, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(task.dueDate) && task.status !== 'DONE' && task.dueDate < today
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
