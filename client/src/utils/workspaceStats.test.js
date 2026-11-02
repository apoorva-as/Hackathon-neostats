import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  attentionTasks,
  contributorsByProject,
  daysUntil,
  groupByStatus,
  managersSummary,
  overallCompletion,
  overdueTasks,
  priorityTasks,
  progressByProject,
  progressFor,
  projectStatusCounts,
  recentlyUpdated,
  relativeDue,
  sortProjects,
  taskStatusCounts,
  upcomingTasks,
  workloadByAssignee,
} from './workspaceStats.js'

const TODAY = '2026-11-02'
const ana = { id: 1, name: 'Ana' }
const bo = { id: 2, name: 'Bo' }
const tasks = [
  { id: 1, projectId: 10, status: 'DONE', priority: 'LOW', dueDate: '2026-10-01', assigneeId: 1, assignee: ana, updatedAt: '2026-10-05' },
  { id: 2, projectId: 10, status: 'TODO', priority: 'HIGH', dueDate: '2026-10-30', assigneeId: 1, assignee: ana, updatedAt: '2026-10-31' },
  { id: 3, projectId: 10, status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: '2026-11-05', assigneeId: 2, assignee: bo, updatedAt: '2026-11-01' },
  { id: 4, projectId: 20, status: 'TODO', priority: 'HIGH', dueDate: null, assigneeId: null, assignee: null, updatedAt: '2026-10-20' },
]

test('date helpers work in UTC calendar days', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02')
  assert.equal(daysUntil('2026-11-05', TODAY), 3)
  assert.equal(relativeDue('2026-11-02', TODAY), 'Due today')
  assert.equal(relativeDue('2026-10-30', TODAY), '3 days overdue')
  assert.equal(relativeDue(null, TODAY), 'No due date')
})

test('project status counts include every status', () => {
  const counts = projectStatusCounts([{ status: 'ACTIVE' }, { status: 'ACTIVE' }, { status: 'ARCHIVED' }])
  assert.deepEqual(counts, { total: 3, ACTIVE: 2, ON_HOLD: 0, COMPLETED: 0, ARCHIVED: 1 })
})

test('task counts: status, open and overdue (done tasks are never overdue)', () => {
  assert.deepEqual(taskStatusCounts(tasks, TODAY), { total: 4, TODO: 2, IN_PROGRESS: 1, DONE: 1, open: 3, overdue: 1 })
})

test('progress per project is done / total', () => {
  const map = progressByProject(tasks, TODAY)
  assert.equal(progressFor(map, 10).percent, 33)
  assert.equal(progressFor(map, 10).overdue, 1)
  assert.equal(progressFor(map, 20).percent, 0)
  assert.equal(progressFor(map, 99).total, 0)
  assert.equal(overallCompletion(tasks), 25)
  assert.equal(overallCompletion([]), 0)
})

test('overdue, upcoming and priority lists', () => {
  assert.deepEqual(overdueTasks(tasks, TODAY).map((t) => t.id), [2])
  assert.deepEqual(upcomingTasks(tasks, TODAY, 7).map((t) => t.id), [3])
  assert.deepEqual(priorityTasks(tasks).map((t) => t.id), [2, 4])
})

test('attention list puts overdue first and labels unassigned work', () => {
  const list = attentionTasks(tasks, TODAY)
  assert.deepEqual(list.map((t) => [t.id, t.reason]), [[2, 'Overdue'], [4, 'Unassigned']])
})

test('workload per assignee ignores unassigned tasks and sorts busiest first', () => {
  const load = workloadByAssignee(tasks, TODAY)
  assert.deepEqual(load.map((l) => [l.user.name, l.open, l.done, l.overdue]), [['Ana', 1, 1, 1], ['Bo', 1, 0, 0]])
})

test('contributors are unique per project', () => {
  const map = contributorsByProject(tasks)
  assert.deepEqual(map.get(10).map((p) => p.name), ['Ana', 'Bo'])
  assert.equal(map.has(20), false)
})

test('recently updated sorts newest first', () => {
  assert.deepEqual(recentlyUpdated(tasks, 2).map((t) => t.id), [3, 2])
})

test('managers summary counts managed and active projects', () => {
  const projects = [
    { id: 1, managerId: 5, status: 'ACTIVE' },
    { id: 2, managerId: 5, status: 'ON_HOLD' },
    { id: 3, managerId: null, status: 'ACTIVE' },
  ]
  const summary = managersSummary([{ id: 6, name: 'Zed' }, { id: 5, name: 'Priya' }], projects)
  assert.deepEqual(summary.map((s) => [s.manager.name, s.projects, s.active]), [['Priya', 2, 1], ['Zed', 0, 0]])
})

test('project sorting and board grouping', () => {
  const projects = [
    { id: 1, name: 'B', memberCount: 1, updatedAt: '2026-01-01', createdAt: '2025-01-01' },
    { id: 2, name: 'A', memberCount: 3, updatedAt: '2026-02-01', createdAt: '2024-01-01' },
  ]
  assert.deepEqual(sortProjects(projects, 'name').map((p) => p.id), [2, 1])
  assert.deepEqual(sortProjects(projects, 'updated').map((p) => p.id), [2, 1])
  assert.deepEqual(sortProjects(projects, 'members').map((p) => p.id), [2, 1])
  assert.deepEqual(sortProjects(projects, 'created').map((p) => p.id), [1, 2])
  const groups = groupByStatus(tasks)
  assert.deepEqual(Object.keys(groups), ['TODO', 'IN_PROGRESS', 'DONE'])
  assert.equal(groups.TODO.length, 2)
})
