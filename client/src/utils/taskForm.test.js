import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatDueDate, isOverdue } from './labels.js'
import {
  eligibleAssignees,
  emptyTaskValues,
  hasChanges,
  toCreatePayload,
  toUpdatePayload,
  validateComment,
  validateTaskForm,
} from './taskForm.js'

const task = {
  id: 4,
  version: 7,
  title: 'Write spec',
  description: 'Old',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '2026-11-15',
  assigneeId: 3,
}

test('task title is required and limited to 200 characters', () => {
  assert.equal(validateTaskForm({ ...emptyTaskValues(), title: '  ' }).title, 'Task title is required.')
  assert.ok(validateTaskForm({ ...emptyTaskValues(), title: 'x'.repeat(201) }).title)
  assert.deepEqual(validateTaskForm({ ...emptyTaskValues(), title: 'OK' }), {})
})

test('validation skips fields the user cannot edit', () => {
  assert.deepEqual(validateTaskForm({ title: '', description: 'fine' }, ['status', 'description']), {})
})

test('create payload trims text and converts empty selections to null', () => {
  const payload = toCreatePayload({ ...emptyTaskValues(), title: ' A ', assigneeId: '5' })
  assert.deepEqual(payload, {
    title: 'A',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    assigneeId: 5,
  })
})

test('update payload carries the loaded version and only changed, editable fields', () => {
  const values = { title: 'Write spec', description: 'New', status: 'DONE', priority: 'HIGH', dueDate: '', assigneeId: '' }
  const asAssignee = toUpdatePayload(values, task, ['status', 'description'])
  assert.deepEqual(asAssignee, { version: 7, description: 'New', status: 'DONE' })

  const asManager = toUpdatePayload(values, task, ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId'])
  assert.deepEqual(asManager, { version: 7, description: 'New', status: 'DONE', priority: 'HIGH', dueDate: null, assigneeId: null })
})

test('an unchanged form has no changes to save', () => {
  const payload = toUpdatePayload({ ...task, assigneeId: '3' }, task, ['title', 'status'])
  assert.equal(hasChanges(payload), false)
})

test('comments must be non-empty and at most 2000 characters', () => {
  assert.ok(validateComment('   '))
  assert.ok(validateComment('x'.repeat(2001)))
  assert.equal(validateComment(' hi '), null)
})

test('only active MEMBER-role Team Members are offered as assignees', () => {
  const members = [
    { role: 'MEMBER', user: { id: 1, isActive: true, role: 'TEAM_MEMBER' } },
    { role: 'VIEWER', user: { id: 2, isActive: true, role: 'TEAM_MEMBER' } },
    { role: 'MEMBER', user: { id: 3, isActive: false, role: 'TEAM_MEMBER' } },
  ]
  assert.deepEqual(eligibleAssignees(members).map((u) => u.id), [1])
})

test('due dates do not shift with the time zone; overdue ignores done tasks', () => {
  assert.doesNotMatch(formatDueDate('2026-11-01'), /31/)
  assert.equal(formatDueDate(null), '—')
  assert.equal(isOverdue({ dueDate: '2026-01-01', status: 'TODO' }, '2026-02-01'), true)
  assert.equal(isOverdue({ dueDate: '2026-01-01', status: 'DONE' }, '2026-02-01'), false)
  assert.equal(isOverdue({ dueDate: null, status: 'TODO' }, '2026-02-01'), false)
})
