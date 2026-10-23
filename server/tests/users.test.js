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

describe('removed development user switcher', () => {
  test('GET /api/dev/users no longer exists (404)', async () => {
    const res = await request(app).get('/api/dev/users')
    assert.equal(res.status, 404)
  })
})

describe('Admin user management', () => {
  const newUser = { name: 'New Person', email: '  New.Person@Test.local ', password: 'Strong-pass-1', role: 'TEAM_MEMBER' }

  test('Admin creates a user: 201, normalized email, password hashed and never returned', async () => {
    const res = await request(app).post('/api/users').set(as(admin)).send(newUser)
    assert.equal(res.status, 201)
    assert.deepEqual(Object.keys(res.body.data).sort(), ['createdAt', 'email', 'id', 'isActive', 'name', 'role'])
    assert.equal(res.body.data.email, 'new.person@test.local')

    const row = await prisma.user.findUnique({ where: { id: res.body.data.id } })
    assert.notEqual(row.passwordHash, newUser.password)
    assert.match(row.passwordHash, /^\$2[aby]\$1\d\$/, 'bcrypt hash with cost >= 10')

    const login = await request(app).post('/api/auth/login').send({ email: newUser.email, password: newUser.password })
    assert.equal(login.status, 200)
  })

  test('duplicate email (any case) is a 409', async () => {
    await request(app).post('/api/users').set(as(admin)).send(newUser)
    const res = await request(app)
      .post('/api/users')
      .set(as(admin))
      .send({ ...newUser, email: 'NEW.PERSON@test.local' })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'EMAIL_TAKEN')
  })

  test('rejects weak passwords, bad emails, unknown roles and extra fields (400)', async () => {
    const bodies = [
      { ...newUser, password: 'short1' },
      { ...newUser, password: 'lettersonly' },
      { ...newUser, password: '12345678901' },
      { ...newUser, password: `${'a1'.repeat(36)}x` }, // > 72 bytes
      { ...newUser, email: 'nope' },
      { ...newUser, role: 'OWNER' },
      { ...newUser, passwordHash: '$2b$10$abc' },
      { ...newUser, isActive: false, tokenVersion: 5 },
    ]
    for (const body of bodies) {
      const res = await request(app).post('/api/users').set(as(admin)).send(body)
      assert.equal(res.status, 400, JSON.stringify(body))
    }
    assert.equal(await prisma.user.count(), 4)
  })

  test('only an Admin can create, read, update or deactivate users (403 for everyone else)', async () => {
    for (const user of [pm, member, viewer]) {
      assert.equal((await request(app).post('/api/users').set(as(user)).send(newUser)).status, 403)
      assert.equal((await request(app).get(`/api/users/${member.id}`).set(as(user))).status, 403)
      assert.equal((await request(app).patch(`/api/users/${member.id}`).set(as(user)).send({ name: 'X' })).status, 403)
      assert.equal(
        (await request(app).patch(`/api/users/${member.id}`).set(as(user)).send({ isActive: false })).status,
        403,
      )
    }
    const row = await prisma.user.findUnique({ where: { id: member.id } })
    assert.equal(row.isActive, true)
    assert.equal(await prisma.user.count(), 4)
  })

  test('no self-promotion: non-admins cannot change their own role', async () => {
    for (const user of [pm, member, viewer]) {
      const res = await request(app).patch(`/api/users/${user.id}`).set(as(user)).send({ role: 'ADMIN' })
      assert.equal(res.status, 403)
      const row = await prisma.user.findUnique({ where: { id: user.id } })
      assert.equal(row.role, user.role)
    }
  })

  test('an Admin cannot demote or deactivate themselves', async () => {
    const demote = await request(app).patch(`/api/users/${admin.id}`).set(as(admin)).send({ role: 'VIEWER' })
    const deactivate = await request(app).patch(`/api/users/${admin.id}`).set(as(admin)).send({ isActive: false })
    assert.equal(demote.status, 403)
    assert.equal(deactivate.status, 403)
    const rename = await request(app).patch(`/api/users/${admin.id}`).set(as(admin)).send({ name: 'Still Admin' })
    assert.equal(rename.status, 200)
  })

  test('Admin reads, updates and deactivates a user (no hard delete)', async () => {
    const get = await request(app).get(`/api/users/${viewer.id}`).set(as(admin))
    assert.equal(get.status, 200)
    assert.equal(get.body.data.passwordHash, undefined)

    const update = await request(app)
      .patch(`/api/users/${viewer.id}`)
      .set(as(admin))
      .send({ name: 'Renamed', email: 'RENAMED@test.local', role: 'TEAM_MEMBER' })
    assert.equal(update.status, 200)
    assert.equal(update.body.data.email, 'renamed@test.local')
    assert.equal(update.body.data.role, 'TEAM_MEMBER')

    const deactivate = await request(app).patch(`/api/users/${viewer.id}`).set(as(admin)).send({ isActive: false })
    assert.equal(deactivate.status, 200)
    assert.equal(deactivate.body.data.isActive, false)
    assert.ok(await prisma.user.findUnique({ where: { id: viewer.id } }), 'user row still exists')

    assert.equal((await request(app).delete(`/api/users/${viewer.id}`).set(as(admin))).status, 404)
  })

  test('role changes that would break project rules are refused (409)', async () => {
    await prisma.project.create({ data: { name: 'Managed', managerId: pm.id } })
    const project = await prisma.project.create({ data: { name: 'Team' } })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })

    const pmRes = await request(app).patch(`/api/users/${pm.id}`).set(as(admin)).send({ role: 'VIEWER' })
    const memberRes = await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({ role: 'ADMIN' })
    assert.equal(pmRes.status, 409)
    assert.equal(memberRes.status, 409)
    assert.equal(pmRes.body.error.code, 'USER_HAS_ASSIGNMENTS')
    assert.equal((await prisma.user.findUnique({ where: { id: member.id } })).role, 'TEAM_MEMBER')
  })

  test('unknown user is 404, empty update is 400', async () => {
    assert.equal((await request(app).get('/api/users/99999').set(as(admin))).status, 404)
    assert.equal((await request(app).patch('/api/users/99999').set(as(admin)).send({ name: 'X' })).status, 404)
    assert.equal((await request(app).patch(`/api/users/${member.id}`).set(as(admin)).send({})).status, 400)
  })
})
