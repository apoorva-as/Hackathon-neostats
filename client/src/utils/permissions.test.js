import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initials } from './labels.js'
import { canChangeTaskStatus, canCreateProject, canViewUsers, navItemsFor } from './permissions.js'

const paths = (role) => navItemsFor(role).map((item) => item.to)

test('Admin navigation includes projects, tasks and users', () => {
  assert.deepEqual(paths('ADMIN'), ['/dashboard', '/projects', '/tasks', '/users'])
})

test('Project Manager and Team Member see "My projects" but not users', () => {
  for (const role of ['PROJECT_MANAGER', 'TEAM_MEMBER']) {
    assert.deepEqual(paths(role), ['/dashboard', '/projects', '/tasks'])
    assert.equal(navItemsFor(role)[1].label, 'My projects')
  }
  assert.equal(navItemsFor('TEAM_MEMBER')[2].label, 'My tasks')
})

test('Viewer navigation is dashboard, projects and tasks (no users)', () => {
  assert.deepEqual(paths('VIEWER'), ['/dashboard', '/projects', '/tasks'])
})

test('board status changes: PM yes, Team Member only own tasks, Admin/Viewer never, archived never', () => {
  const task = { assigneeId: 7, project: { status: 'ACTIVE' } }
  assert.equal(canChangeTaskStatus({ id: 1, role: 'PROJECT_MANAGER' }, task), true)
  assert.equal(canChangeTaskStatus({ id: 7, role: 'TEAM_MEMBER' }, task), true)
  assert.equal(canChangeTaskStatus({ id: 8, role: 'TEAM_MEMBER' }, task), false)
  assert.equal(canChangeTaskStatus({ id: 1, role: 'ADMIN' }, task), false)
  assert.equal(canChangeTaskStatus({ id: 1, role: 'VIEWER' }, task), false)
  assert.equal(canChangeTaskStatus({ id: 1, role: 'PROJECT_MANAGER' }, { ...task, project: { status: 'ARCHIVED' } }), false)
})

test('only Admin gets create-project and user-directory UI', () => {
  assert.equal(canCreateProject({ role: 'ADMIN' }), true)
  for (const role of ['PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']) {
    assert.equal(canCreateProject({ role }), false)
    assert.equal(canViewUsers({ role }), false)
  }
  assert.equal(canCreateProject(null), false)
})

test('initials uses first and last name', () => {
  assert.equal(initials('Priya Sharma'), 'PS')
  assert.equal(initials('Ada'), 'A')
  assert.equal(initials(''), '?')
})

test('breadcrumbs follow the URL', async () => {
  const { breadcrumbsFor } = await import('./permissions.js')
  const labels = (path) => breadcrumbsFor(path).map((c) => c.label)
  assert.deepEqual(labels('/dashboard'), ['Workspace', 'Dashboard'])
  assert.deepEqual(labels('/projects/4/edit'), ['Workspace', 'Projects', 'Project', 'Edit'])
  assert.deepEqual(labels('/projects/4/tasks/new'), ['Workspace', 'Projects', 'Project', 'New task'])
  assert.deepEqual(labels('/tasks/9'), ['Workspace', 'Tasks', 'Task details'])
  assert.equal(breadcrumbsFor('/projects/4/edit')[2].to, '/projects/4')
})
