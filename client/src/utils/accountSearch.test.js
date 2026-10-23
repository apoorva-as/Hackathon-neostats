import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountsForRole, filterAccounts, firstAccountPerRole } from './accountSearch.js'

const accounts = [
  { id: 1, name: 'Ada Admin', email: 'admin@neostats.local', role: 'ADMIN' },
  { id: 2, name: 'Priya Sharma', email: 'priya.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { id: 3, name: 'Marcus Lee', email: 'marcus.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { id: 4, name: 'Aisha Khan', email: 'aisha@neostats.local', role: 'TEAM_MEMBER' },
  { id: 5, name: 'Vera Viewer', email: 'viewer@neostats.local', role: 'VIEWER' },
]
const ids = (list) => list.map((a) => a.id)

test('empty query returns every account in order', () => {
  assert.deepEqual(ids(filterAccounts(accounts, '')), [1, 2, 3, 4, 5])
  assert.deepEqual(ids(filterAccounts(accounts, '   ')), [1, 2, 3, 4, 5])
})

test('matches name, email and role label, case-insensitively', () => {
  assert.deepEqual(ids(filterAccounts(accounts, 'PRIYA')), [2])
  assert.deepEqual(ids(filterAccounts(accounts, 'aisha@')), [4])
  assert.deepEqual(ids(filterAccounts(accounts, 'project manager')), [2, 3], 'several users with the same role')
  assert.deepEqual(ids(filterAccounts(accounts, 'manager lee')), [3], 'all words must match')
})

test('no match gives an empty list', () => {
  assert.deepEqual(filterAccounts(accounts, 'nobody'), [])
})

test('firstAccountPerRole picks one account per role in role order', () => {
  assert.deepEqual(ids(firstAccountPerRole(accounts)), [1, 2, 4, 5])
  assert.deepEqual(firstAccountPerRole([]), [])
})

test('accountsForRole keeps only accounts of that role, all of them', () => {
  assert.deepEqual(ids(accountsForRole(accounts, 'VIEWER')), [5])
  assert.deepEqual(ids(accountsForRole(accounts, 'PROJECT_MANAGER')), [2, 3], 'several users with the same role')
  assert.deepEqual(ids(accountsForRole(accounts, 'TEAM_MEMBER')), [4])
  assert.deepEqual(ids(accountsForRole(accounts, 'ADMIN')), [1])
})

test('accountsForRole with no role or no matching accounts gives an empty list', () => {
  assert.deepEqual(accountsForRole(accounts, ''), [])
  assert.deepEqual(accountsForRole(accounts, null), [])
  assert.deepEqual(accountsForRole(accounts.slice(0, 1), 'VIEWER'), [])
})

test('search within a role filters by name or email', () => {
  const pms = accountsForRole(accounts, 'PROJECT_MANAGER')
  assert.deepEqual(ids(filterAccounts(pms, 'marcus')), [3])
  assert.deepEqual(ids(filterAccounts(pms, 'priya.pm@')), [2])
  assert.deepEqual(filterAccounts(pms, 'aisha'), [], 'accounts of other roles never appear')
})
