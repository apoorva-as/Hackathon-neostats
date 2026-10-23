import assert from 'node:assert/strict'
import { test } from 'node:test'
import { passwordProblem, toUserPayload, validateLoginForm, validateUserForm } from './authForm.js'

test('login form requires a valid email and a password', () => {
  assert.deepEqual(validateLoginForm({ email: '', password: '' }), {
    email: 'Email is required.',
    password: 'Password is required.',
  })
  assert.equal(validateLoginForm({ email: 'nope', password: 'x' }).email, 'Enter a valid email address.')
  assert.deepEqual(validateLoginForm({ email: ' ana@x.com ', password: 'x' }), {})
})

test('password policy matches the server', () => {
  assert.match(passwordProblem('short1'), /at least 8/)
  assert.match(passwordProblem('lettersonly'), /letter and a digit/)
  assert.match(passwordProblem('1234567890'), /letter and a digit/)
  assert.match(passwordProblem(`${'a1'.repeat(36)}x`), /72 bytes/)
  assert.equal(passwordProblem('Neostats@123'), null)
})

test('user form: password required when creating, optional when editing', () => {
  const values = { name: 'Ana', email: 'ana@x.com', role: 'VIEWER', password: '' }
  assert.ok(validateUserForm(values, { isNew: true }).password)
  assert.deepEqual(validateUserForm(values, { isNew: false }), {})
  assert.ok(validateUserForm({ ...values, password: 'weak' }, { isNew: false }).password)
  assert.ok(validateUserForm({ ...values, name: ' ', role: '' }, { isNew: false }).name)
})

test('user payload: full for create, only changed fields for edit', () => {
  const values = { name: ' Ana ', email: ' ANA@x.com ', role: 'VIEWER', password: 'Secret123' }
  assert.deepEqual(toUserPayload(values), { name: 'Ana', email: 'ana@x.com', role: 'VIEWER', password: 'Secret123' })

  const original = { name: 'Ana', email: 'ana@x.com', role: 'TEAM_MEMBER' }
  assert.deepEqual(toUserPayload({ ...values, password: '' }, original), { role: 'VIEWER' })
  assert.deepEqual(toUserPayload(values, original), { role: 'VIEWER', password: 'Secret123' })
})
