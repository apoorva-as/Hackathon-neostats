import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toProjectPayload, validateProjectForm } from './projectForm.js'

test('a blank or whitespace-only name is rejected', () => {
  assert.equal(validateProjectForm({ name: '   ', description: '' }).name, 'Project name is required.')
})

test('overly long name and description are rejected', () => {
  const errors = validateProjectForm({ name: 'x'.repeat(121), description: 'y'.repeat(2001) })
  assert.ok(errors.name)
  assert.ok(errors.description)
})

test('valid values produce no errors', () => {
  assert.deepEqual(validateProjectForm({ name: 'Website', description: 'Desc' }), {})
})

test('payload trims text and converts the manager id', () => {
  const payload = toProjectPayload({ name: '  Site ', description: ' d ', status: 'ACTIVE', managerId: '7' })
  assert.deepEqual(payload, { name: 'Site', description: 'd', status: 'ACTIVE', managerId: 7 })
})

test('an empty manager selection becomes null (unassigned)', () => {
  assert.equal(toProjectPayload({ name: 'A', description: '', status: 'ACTIVE', managerId: '' }).managerId, null)
})

test('managerId is left out when the user may not assign managers', () => {
  const payload = toProjectPayload({ name: 'A', description: '', status: 'ON_HOLD', managerId: '3' }, { includeManager: false })
  assert.equal('managerId' in payload, false)
})
