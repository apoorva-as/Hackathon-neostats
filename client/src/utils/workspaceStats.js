// Pure helpers that turn API data (projects, tasks, users) into dashboard
// numbers. Nothing here is hard-coded: every value is derived from the lists
// the API returned for the signed-in user. Unit tested in workspaceStats.test.js.

import { PROJECT_STATUSES, TASK_STATUSES, isOverdue } from './labels.js'

export const todayIso = () => new Date().toISOString().slice(0, 10)

// "YYYY-MM-DD" + n days, computed in UTC so the date never shifts.
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Whole days from `today` until `isoDate` (negative = in the past).
export function daysUntil(isoDate, today = todayIso()) {
  const ms = new Date(`${isoDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)
  return Math.round(ms / 86400000)
}

export function relativeDue(isoDate, today = todayIso()) {
  if (!isoDate) return 'No due date'
  const days = daysUntil(isoDate, today)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) return `${-days} days overdue`
  return `Due in ${days} days`
}

// { total, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED }
export function projectStatusCounts(projects) {
  const counts = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0]))
  for (const project of projects) counts[project.status] = (counts[project.status] ?? 0) + 1
  return { total: projects.length, ...counts }
}

// { total, TODO, IN_PROGRESS, DONE, open, overdue }
export function taskStatusCounts(tasks, today = todayIso()) {
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]))
  let overdue = 0
  for (const task of tasks) {
    counts[task.status] = (counts[task.status] ?? 0) + 1
    if (isOverdue(task, today)) overdue += 1
  }
  return { total: tasks.length, ...counts, open: tasks.length - counts.DONE, overdue }
}

const percent = (part, whole) => (whole === 0 ? 0 : Math.round((part / whole) * 100))

// projectId -> { total, done, inProgress, todo, overdue, percent }
export function progressByProject(tasks, today = todayIso()) {
  const map = new Map()
  for (const task of tasks) {
    const entry = map.get(task.projectId) ?? { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, percent: 0 }
    entry.total += 1
    if (task.status === 'DONE') entry.done += 1
    else if (task.status === 'IN_PROGRESS') entry.inProgress += 1
    else entry.todo += 1
    if (isOverdue(task, today)) entry.overdue += 1
    entry.percent = percent(entry.done, entry.total)
    map.set(task.projectId, entry)
  }
  return map
}

const EMPTY_PROGRESS = { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, percent: 0 }
export const progressFor = (map, projectId) => map.get(projectId) ?? EMPTY_PROGRESS

// Share of all visible tasks that are done (0–100).
export function overallCompletion(tasks) {
  return percent(tasks.filter((t) => t.status === 'DONE').length, tasks.length)
}

const byDueDate = (a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.id - b.id

export function overdueTasks(tasks, today = todayIso()) {
  return tasks.filter((t) => isOverdue(t, today)).sort(byDueDate)
}

// Unfinished tasks due between today and today + `days` (inclusive).
export function upcomingTasks(tasks, today = todayIso(), days = 14) {
  const until = addDays(today, days)
  return tasks.filter((t) => t.status !== 'DONE' && t.dueDate && t.dueDate >= today && t.dueDate <= until).sort(byDueDate)
}

// Unfinished HIGH priority tasks, earliest due first.
export function priorityTasks(tasks) {
  return tasks.filter((t) => t.status !== 'DONE' && t.priority === 'HIGH').sort(byDueDate)
}

// Unfinished tasks that need a manager's attention: overdue or unassigned.
// Overdue ones come first, then by due date.
export function attentionTasks(tasks, today = todayIso()) {
  return tasks
    .filter((t) => t.status !== 'DONE' && (isOverdue(t, today) || !t.assigneeId))
    .map((t) => ({ ...t, reason: isOverdue(t, today) ? 'Overdue' : 'Unassigned' }))
    .sort((a, b) => Number(b.reason === 'Overdue') - Number(a.reason === 'Overdue') || byDueDate(a, b))
}

// Newest first by updatedAt (works for projects and tasks).
export function recentlyUpdated(items, count = 5) {
  return [...items].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.id - a.id).slice(0, count)
}

// Per assignee: open / in progress / done / overdue counts, busiest first.
export function workloadByAssignee(tasks, today = todayIso()) {
  const map = new Map()
  for (const task of tasks) {
    if (!task.assignee) continue
    const entry = map.get(task.assignee.id) ?? { user: task.assignee, todo: 0, inProgress: 0, done: 0, overdue: 0, open: 0 }
    if (task.status === 'DONE') entry.done += 1
    else {
      entry.open += 1
      if (task.status === 'IN_PROGRESS') entry.inProgress += 1
      else entry.todo += 1
    }
    if (isOverdue(task, today)) entry.overdue += 1
    map.set(task.assignee.id, entry)
  }
  return [...map.values()].sort((a, b) => b.open - a.open || a.user.name.localeCompare(b.user.name))
}

// projectId -> unique task assignees [{ id, name }] (people working on it).
export function contributorsByProject(tasks) {
  const map = new Map()
  for (const task of tasks) {
    if (!task.assignee) continue
    const list = map.get(task.projectId) ?? []
    if (!list.some((p) => p.id === task.assignee.id)) list.push(task.assignee)
    map.set(task.projectId, list)
  }
  return map
}

// Each project manager with how many projects they run (and how many are active).
export function managersSummary(managers, projects) {
  return managers
    .map((manager) => {
      const own = projects.filter((p) => p.managerId === manager.id)
      return { manager, projects: own.length, active: own.filter((p) => p.status === 'ACTIVE').length }
    })
    .sort((a, b) => b.projects - a.projects || a.manager.name.localeCompare(b.manager.name))
}

// Client-side sort for the projects page.
export const PROJECT_SORTS = {
  updated: { label: 'Recently updated', compare: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) },
  name: { label: 'Name (A–Z)', compare: (a, b) => a.name.localeCompare(b.name) },
  created: { label: 'Newest first', compare: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) },
  members: { label: 'Most members', compare: (a, b) => b.memberCount - a.memberCount },
}

export function sortProjects(projects, key) {
  const sort = PROJECT_SORTS[key] ?? PROJECT_SORTS.updated
  return [...projects].sort((a, b) => sort.compare(a, b) || a.id - b.id)
}

// Tasks grouped by status for a Kanban board: { TODO: [], IN_PROGRESS: [], DONE: [] }
export function groupByStatus(tasks) {
  const groups = Object.fromEntries(TASK_STATUSES.map((s) => [s, []]))
  for (const task of tasks) (groups[task.status] ?? groups.TODO).push(task)
  return groups
}
