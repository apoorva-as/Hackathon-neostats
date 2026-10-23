import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createProject, createUser, prisma, resetDatabase } from './helpers/db.js'

let admin, pm, otherPm, member, viewer

beforeEach(async () => {
  await resetDatabase()
  admin = await createUser('ADMIN')
  pm = await createUser('PROJECT_MANAGER')
  otherPm = await createUser('PROJECT_MANAGER')
  member = await createUser('TEAM_MEMBER')
  viewer = await createUser('VIEWER')
})

after(() => prisma.$disconnect())

describe('dev user switcher (temporary, not authentication)', () => {
  test('requests without X-Dev-User-Id are rejected with 401', async () => {
    const res = await request(app).get('/api/projects')
    assert.equal(res.status, 401)
    assert.equal(res.body.error.code, 'UNAUTHENTICATED')
  })

  test('an unknown user id is rejected with 401', async () => {
    const res = await request(app).get('/api/projects').set('X-Dev-User-Id', '99999')
    assert.equal(res.status, 401)
  })

  test('a deactivated user is rejected with 403', async () => {
    const inactive = await createUser('ADMIN', { isActive: false })
    const res = await request(app).get('/api/projects').set(as(inactive))
    assert.equal(res.status, 403)
    assert.equal(res.body.error.code, 'USER_INACTIVE')
  })
})

describe('GET /api/projects', () => {
  test('Admin sees all projects with manager and member count', async () => {
    const p1 = await createProject({ name: 'Alpha', managerId: pm.id })
    await createProject({ name: 'Beta' })
    await prisma.projectMember.create({ data: { projectId: p1.id, userId: member.id } })

    const res = await request(app).get('/api/projects').set(as(admin))
    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.length, 2)
    assert.equal(res.body.meta.total, 2)
    const alpha = res.body.data.find((p) => p.name === 'Alpha')
    assert.equal(alpha.manager.id, pm.id)
    assert.equal(alpha.memberCount, 1)
    assert.equal(alpha.status, 'ACTIVE')
  })

  test('Project Manager sees only projects they manage', async () => {
    await createProject({ name: 'Mine', managerId: pm.id })
    await createProject({ name: 'Theirs', managerId: otherPm.id })
    const res = await request(app).get('/api/projects').set(as(pm))
    assert.deepEqual(res.body.data.map((p) => p.name), ['Mine'])
  })

  test('Team Member sees only projects they belong to', async () => {
    const joined = await createProject({ name: 'Joined' })
    await createProject({ name: 'Other' })
    await prisma.projectMember.create({ data: { projectId: joined.id, userId: member.id } })
    const res = await request(app).get('/api/projects').set(as(member))
    assert.deepEqual(res.body.data.map((p) => p.name), ['Joined'])
  })

  test('Viewer sees all projects (read-only)', async () => {
    await createProject()
    await createProject()
    const res = await request(app).get('/api/projects').set(as(viewer))
    assert.equal(res.body.data.length, 2)
  })

  test('supports status filter, search and pagination', async () => {
    await createProject({ name: 'Website Redesign' })
    await createProject({ name: 'Old Thing', status: 'ARCHIVED' })
    await createProject({ name: 'Website Copy' })

    const archived = await request(app).get('/api/projects?status=ARCHIVED').set(as(admin))
    assert.deepEqual(archived.body.data.map((p) => p.name), ['Old Thing'])

    const search = await request(app).get('/api/projects?search=website').set(as(admin))
    assert.equal(search.body.data.length, 2)

    const page = await request(app).get('/api/projects?limit=2&page=2').set(as(admin))
    assert.equal(page.body.data.length, 1)
    assert.deepEqual(page.body.meta, { page: 2, limit: 2, total: 3, totalPages: 2 })
  })

  test('rejects an invalid status filter with 400', async () => {
    const res = await request(app).get('/api/projects?status=DONE').set(as(admin))
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'VALIDATION_ERROR')
  })
})

describe('GET /api/projects/:id', () => {
  test('returns the project with permissions for the actor', async () => {
    const project = await createProject({ managerId: pm.id })
    const res = await request(app).get(`/api/projects/${project.id}`).set(as(pm))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.id, project.id)
    assert.deepEqual(res.body.data.permissions, {
      canEdit: true,
      canDelete: false,
      canAssignManager: false,
      canManageMembers: true,
      canManageTasks: true,
    })
  })

  test('Viewer gets read-only permissions', async () => {
    const project = await createProject()
    const res = await request(app).get(`/api/projects/${project.id}`).set(as(viewer))
    assert.equal(res.status, 200)
    assert.equal(Object.values(res.body.data.permissions).some(Boolean), false)
  })

  test('returns 404 for a nonexistent project', async () => {
    const res = await request(app).get('/api/projects/424242').set(as(admin))
    assert.equal(res.status, 404)
    assert.equal(res.body.error.code, 'PROJECT_NOT_FOUND')
  })

  test('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/projects/abc').set(as(admin))
    assert.equal(res.status, 400)
  })

  test('returns 403 when a Team Member opens a project they do not belong to', async () => {
    const project = await createProject()
    const res = await request(app).get(`/api/projects/${project.id}`).set(as(member))
    assert.equal(res.status, 403)
  })
})

describe('POST /api/projects', () => {
  test('Admin creates a project with a manager; it is persisted', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(as(admin))
      .send({ name: '  New Project  ', description: 'Desc', managerId: pm.id })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.name, 'New Project') // trimmed
    assert.equal(res.body.data.manager.id, pm.id)
    assert.equal(res.body.data.memberCount, 0)

    const row = await prisma.project.findUnique({ where: { id: res.body.data.id } })
    assert.equal(row.managerId, pm.id)
  })

  test('creates a project without a manager', async () => {
    const res = await request(app).post('/api/projects').set(as(admin)).send({ name: 'Solo' })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.manager, null)
    assert.equal(res.body.data.description, '')
  })

  test('rejects a missing name with 400', async () => {
    const res = await request(app).post('/api/projects').set(as(admin)).send({ description: 'x' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'VALIDATION_ERROR')
    assert.equal(res.body.error.details[0].path, 'name')
  })

  test('rejects unknown fields with 400', async () => {
    const res = await request(app).post('/api/projects').set(as(admin)).send({ name: 'X', manager_id: 1 })
    assert.equal(res.status, 400)
  })

  test('rejects a manager who is not a PROJECT_MANAGER', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(as(admin))
      .send({ name: 'X', managerId: member.id })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'INVALID_MANAGER')
    assert.equal(await prisma.project.count(), 0)
  })

  test('rejects a nonexistent or deactivated manager', async () => {
    const missing = await request(app).post('/api/projects').set(as(admin)).send({ name: 'X', managerId: 99999 })
    assert.equal(missing.status, 400)
    const inactivePm = await createUser('PROJECT_MANAGER', { isActive: false })
    const inactive = await request(app)
      .post('/api/projects')
      .set(as(admin))
      .send({ name: 'X', managerId: inactivePm.id })
    assert.equal(inactive.status, 400)
  })

  test('non-Admins cannot create projects (403)', async () => {
    for (const user of [pm, member, viewer]) {
      const res = await request(app).post('/api/projects').set(as(user)).send({ name: 'Nope' })
      assert.equal(res.status, 403, `${user.role} should be forbidden`)
    }
    assert.equal(await prisma.project.count(), 0)
  })
})

describe('PATCH /api/projects/:id', () => {
  test('Admin updates details and reassigns the manager', async () => {
    const project = await createProject({ managerId: pm.id })
    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(as(admin))
      .send({ name: 'Renamed', status: 'ON_HOLD', managerId: otherPm.id })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.name, 'Renamed')
    assert.equal(res.body.data.status, 'ON_HOLD')
    assert.equal(res.body.data.manager.id, otherPm.id)
  })

  test('Admin can unassign the manager with null', async () => {
    const project = await createProject({ managerId: pm.id })
    const res = await request(app).patch(`/api/projects/${project.id}`).set(as(admin)).send({ managerId: null })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.manager, null)
  })

  test('archiving sets archivedAt and un-archiving clears it', async () => {
    const project = await createProject()
    const archived = await request(app).patch(`/api/projects/${project.id}`).set(as(admin)).send({ status: 'ARCHIVED' })
    assert.ok(archived.body.data.archivedAt)
    const restored = await request(app).patch(`/api/projects/${project.id}`).set(as(admin)).send({ status: 'ACTIVE' })
    assert.equal(restored.body.data.archivedAt, null)
  })

  test('rejects an invalid manager assignment', async () => {
    const project = await createProject({ managerId: pm.id })
    const res = await request(app).patch(`/api/projects/${project.id}`).set(as(admin)).send({ managerId: viewer.id })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'INVALID_MANAGER')
    const row = await prisma.project.findUnique({ where: { id: project.id } })
    assert.equal(row.managerId, pm.id)
  })

  test('the assigned PM can edit details but not reassign the manager', async () => {
    const project = await createProject({ managerId: pm.id })
    const ok = await request(app).patch(`/api/projects/${project.id}`).set(as(pm)).send({ description: 'Updated' })
    assert.equal(ok.status, 200)
    const reassign = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(as(pm))
      .send({ managerId: otherPm.id })
    assert.equal(reassign.status, 403)
  })

  test('another PM, Team Member and Viewer cannot edit (403)', async () => {
    const project = await createProject({ managerId: pm.id })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
    for (const user of [otherPm, member, viewer]) {
      const res = await request(app).patch(`/api/projects/${project.id}`).set(as(user)).send({ name: 'Hack' })
      assert.equal(res.status, 403, `${user.role} should be forbidden`)
    }
  })

  test('rejects an empty update with 400 and a missing project with 404', async () => {
    const project = await createProject()
    const empty = await request(app).patch(`/api/projects/${project.id}`).set(as(admin)).send({})
    assert.equal(empty.status, 400)
    const missing = await request(app).patch('/api/projects/999999').set(as(admin)).send({ name: 'X' })
    assert.equal(missing.status, 404)
  })
})

describe('DELETE /api/projects/:id', () => {
  test('Admin deletes a project; its memberships go too, users stay', async () => {
    const project = await createProject({ managerId: pm.id })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })

    const res = await request(app).delete(`/api/projects/${project.id}`).set(as(admin))
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.data, { id: project.id })

    assert.equal(await prisma.project.count({ where: { id: project.id } }), 0)
    assert.equal(await prisma.projectMember.count({ where: { projectId: project.id } }), 0)
    assert.ok(await prisma.user.findUnique({ where: { id: member.id } }))
    assert.ok(await prisma.user.findUnique({ where: { id: pm.id } }))
  })

  test('the project manager cannot delete their project (403)', async () => {
    const project = await createProject({ managerId: pm.id })
    const res = await request(app).delete(`/api/projects/${project.id}`).set(as(pm))
    assert.equal(res.status, 403)
    assert.equal(await prisma.project.count(), 1)
  })

  test('returns 404 for a nonexistent project', async () => {
    const res = await request(app).delete('/api/projects/999999').set(as(admin))
    assert.equal(res.status, 404)
  })
})
