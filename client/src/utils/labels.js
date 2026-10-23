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

export const PROJECT_ROLE_LABELS = {
  MEMBER: 'Member',
  VIEWER: 'Read-only',
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
