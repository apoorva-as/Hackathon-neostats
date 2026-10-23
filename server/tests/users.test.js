import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createUser, prisma, resetDatabase } from './helpers/db.js'

let admin, pm, member, viewer

beforeEach(async () => {
  await resetDatabase()
  admin = await createUser('ADMIN')
  pm = await createUser('PROJECT_MANAGER')
  member = await createUser('TEAM_MEMBER')
  viewer = await createUser('VIEWER')
})

after(() => prisma.$disconnect())

describe('GET /api/users', () => {
  test('Admin lists users with only public fields', async () => {
    const res = await request(app).get('/api/users').set(as(admin))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 4)
    assert.deepEqual(Object.keys(res.body.data[0]).sort(), ['email', 'id', 'isActive', 'name', 'role'])
  })

  test('filters by role', async () => {
    const res = await request(app).get('/api/users?role=TEAM_MEMBER').set(as(pm))
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.data.map((u) => u.id), [member.id])
  })

  test('Team Members and Viewers cannot list users (403)', async () => {
    for (const user of [member, viewer]) {
      const res = await request(app).get('/api/users').set(as(user))
      assert.equal(res.status, 403)
    }
  })

  test('rejects an invalid role filter (400)', async () => {
    const res = await request(app).get('/api/users?role=OWNER').set(as(admin))
    assert.equal(res.status, 400)
  })
})

describe('GET /api/dev/users (temporary dev switcher)', () => {
  test('lists active users without requiring a selected user', async () => {
    await createUser('TEAM_MEMBER', { isActive: false })
    const res = await request(app).get('/api/dev/users')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 4)
  })
})
