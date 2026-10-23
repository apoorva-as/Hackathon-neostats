// Client-side helpers for task and comment forms, matching the server's Zod
// rules. They give instant feedback; the server still validates everything.
export const TITLE_MAX = 200
export const TASK_DESCRIPTION_MAX = 5000
export const COMMENT_MAX = 2000

export const ALL_TASK_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId']

export function emptyTaskValues() {
  return { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assigneeId: '' }
}

// API task → form state (selects and date inputs work with strings).
export function taskToFormValues(task) {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
  }
}

// Only checks the fields the user may edit.
export function validateTaskForm(values, fields = ALL_TASK_FIELDS) {
  const errors = {}
  if (fields.includes('title')) {
    const title = (values.title ?? '').trim()
    if (!title) errors.title = 'Task title is required.'
    else if (title.length > TITLE_MAX) errors.title = `Task title is too long (max ${TITLE_MAX} characters).`
  }
  if (fields.includes('description') && (values.description ?? '').trim().length > TASK_DESCRIPTION_MAX) {
    errors.description = `Description is too long (max ${TASK_DESCRIPTION_MAX} characters).`
  }
  return errors
}

function fieldValue(field, values) {
  switch (field) {
    case 'title':
    case 'description':
      return (values[field] ?? '').trim()
    case 'dueDate':
      return values.dueDate || null
    case 'assigneeId':
      return values.assigneeId ? Number(values.assigneeId) : null
    default:
      return values[field]
  }
}

export function toCreatePayload(values) {
  return Object.fromEntries(ALL_TASK_FIELDS.map((field) => [field, fieldValue(field, values)]))
}

// PATCH payload: the loaded `version` plus only the editable fields that changed.
export function toUpdatePayload(values, task, editableFields) {
  const payload = { version: task.version }
  const original = taskToFormValues(task)
  for (const field of editableFields) {
    const next = fieldValue(field, values)
    if (next !== fieldValue(field, original)) payload[field] = next
  }
  return payload
}

export const hasChanges = (payload) => Object.keys(payload).some((key) => key !== 'version')

export function validateComment(body) {
  const text = (body ?? '').trim()
  if (!text) return 'Write a comment first.'
  if (text.length > COMMENT_MAX) return `Comment is too long (max ${COMMENT_MAX} characters).`
  return null
}

// Users a task may be assigned to: active members with project role MEMBER.
// (The server enforces the same rule; this only fills the dropdown.)
export function eligibleAssignees(members = []) {
  return members.filter((m) => m.role === 'MEMBER' && m.user.isActive && m.user.role === 'TEAM_MEMBER').map((m) => m.user)
}
