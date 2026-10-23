import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initials } from './labels.js'
import { canCreateProject, canViewUsers, navItemsFor } from './permissions.js'

const paths = (role) => navItemsFor(role).map((item) => item.to)

test('Admin navigation includes projects and users', () => {
  assert.deepEqual(paths('ADMIN'), ['/dashboard', '/projects', '/users'])
})

test('Project Manager and Team Member see "My projects" but not users', () => {
  for (const role of ['PROJECT_MANAGER', 'TEAM_MEMBER']) {
    assert.deepEqual(paths(role), ['/dashboard', '/projects'])
    assert.equal(navItemsFor(role)[1].label, 'My projects')
  }
})

test('Viewer navigation is dashboard + projects only', () => {
  assert.deepEqual(paths('VIEWER'), ['/dashboard', '/projects'])
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
