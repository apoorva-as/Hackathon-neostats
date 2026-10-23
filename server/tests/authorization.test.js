// Role x resource security matrix. Every request goes through the real
// requireAuth middleware with a signed session cookie (helpers/db.js#as).
import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createProject, createTask, createUser, prisma, resetDatabase } from './helpers/db.js'

let admin, pm, otherPm, member, outsider, viewer, project, otherProject, ownTask, othersTask

beforeEach(async () => {
  await resetDatabase()
  admin = await createUser('ADMIN')
  pm = await createUser('PROJECT_MANAGER')
  otherPm = await createUser('PROJECT_MANAGER')
  member = await createUser('TEAM_MEMBER')
  outsider = await createUser('TEAM_MEMBER')
  viewer = await createUser('VIEWER')
  project = await createProject({ managerId: pm.id })
  otherProject = await createProject({ managerId: otherPm.id })
  await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
  await prisma.projectMember.create({ data: { projectId: otherProject.id, userId: outsider.id } })
  ownTask = await createTask(project.id, { assigneeId: member.id })
  othersTask = await createTask(project.id)
})

after(() => prisma.$disconnect())

async function assertUnchanged(before) {
  const row = await prisma.task.findUnique({ where: { id: before.id } })
  assert.equal(row.version, before.version)
  assert.equal(row.title, before.title)
  assert.equal(row.status, before.status)
}

describe('Project Manager boundaries', () => {
  test('manages assigned projects', async () => {
    assert.equal((await request(app).get(`/api/projects/${project.id}`).set(as(pm))).status, 200)
    const add = await request(app).post(`/api/projects/${project.id}/members`).set(as(pm)).send({ userId: outsider.id })
    assert.equal(add.status, 201)
    const task = await request(app).post(`/api/projects/${project.id}/tasks`).set(as(pm)).send({ title: 'New' })
    assert.equal(task.status, 201)
  })

  test('cannot read or change an unrelated project, its team or its tasks (403)', async () => {
    const otherTask = await createTask(otherProject.id)
    const calls = [
      () => request(app).get(`/api/projects/${otherProject.id}`),
      () => request(app).patch(`/api/projects/${otherProject.id}`).send({ name: 'Hijacked' }),
      () => request(app).get(`/api/projects/${otherProject.id}/members`),
      () => request(app).post(`/api/projects/${otherProject.id}/members`).send({ userId: member.id }),
      () => request(app).delete(`/api/projects/${otherProject.id}/members/${outsider.id}`),
      () => request(app).post(`/api/projects/${otherProject.id}/tasks`).send({ title: 'X' }),
      () => request(app).get(`/api/tasks/${otherTask.id}`),
      () => request(app).patch(`/api/tasks/${otherTask.id}`).send({ version: 1, title: 'X' }),
      () => request(app).delete(`/api/tasks/${otherTask.id}`),
    ]
    for (const call of calls) assert.equal((await call().set(as(pm))).status, 403)
    assert.equal((await prisma.project.findUnique({ where: { id: otherProject.id } })).name, otherProject.name)
    assert.equal(await prisma.projectMember.count({ where: { projectId: otherProject.id } }), 1)
    await assertUnchanged(otherTask)
  })

  test('cannot perform Admin-only operations (403)', async () => {
    const calls = [
      () => request(app).post('/api/projects').send({ name: 'Mine' }),
      () => request(app).delete(`/api/projects/${project.id}`),
      () => request(app).patch(`/api/projects/${project.id}`).send({ managerId: otherPm.id }),
      () =>
        request(app).post('/api/users').send({ name: 'X', email: 'x@test.local', password: 'Strong-pass-1', role: 'ADMIN' }),
    ]
    for (const call of calls) assert.equal((await call().set(as(pm))).status, 403)
    assert.equal(await prisma.project.count(), 2)
  })
})

describe('Team Member boundaries', () => {
  test('sees only projects they belong to', async () => {
    const list = await request(app).get('/api/projects').set(as(member))
    assert.deepEqual(list.body.data.map((p) => p.id), [project.id])
    assert.equal((await request(app).get(`/api/projects/${otherProject.id}`).set(as(member))).status, 403)
  })

  test('updates status/description of their own task only', async () => {
    const ok = await request(app).patch(`/api/tasks/${ownTask.id}`).set(as(member)).send({ version: 1, status: 'DONE' })
    assert.equal(ok.status, 200)

    const notMine = await request(app)
      .patch(`/api/tasks/${othersTask.id}`)
      .set(as(member))
      .send({ version: 1, status: 'DONE' })
    assert.equal(notMine.status, 403)
    await assertUnchanged(othersTask)

    const fresh = await prisma.task.findUnique({ where: { id: ownTask.id } })
    const title = await request(app)
      .patch(`/api/tasks/${ownTask.id}`)
      .set(as(member))
      .send({ version: fresh.version, title: 'Mine now' })
    assert.equal(title.status, 403)
    const reassign = await request(app)
      .patch(`/api/tasks/${ownTask.id}`)
      .set(as(member))
      .send({ version: fresh.version, assigneeId: outsider.id })
    assert.equal(reassign.status, 403)
    await assertUnchanged(fresh)
  })

  test('cannot perform Project Manager operations (403)', async () => {
    const calls = [
      () => request(app).patch(`/api/projects/${project.id}`).send({ name: 'X' }),
      () => request(app).post(`/api/projects/${project.id}/members`).send({ userId: outsider.id }),
      () => request(app).patch(`/api/projects/${project.id}/members/${member.id}`).send({ role: 'VIEWER' }),
      () => request(app).delete(`/api/projects/${project.id}/members/${member.id}`),
      () => request(app).post(`/api/projects/${project.id}/tasks`).send({ title: 'X' }),
      () => request(app).delete(`/api/tasks/${othersTask.id}`),
      () => request(app).get('/api/users'),
    ]
    for (const call of calls) assert.equal((await call().set(as(member))).status, 403)
    assert.equal(await prisma.projectMember.count({ where: { projectId: project.id } }), 1)
    assert.equal(await prisma.task.count(), 2)
  })

  test('comments are always authored by the signed-in user (another user id in the body is rejected)', async () => {
    const spoof = await request(app)
      .post(`/api/tasks/${ownTask.id}/comments`)
      .set(as(member))
      .send({ body: 'hi', authorId: pm.id })
    assert.equal(spoof.status, 400)

    const ok = await request(app).post(`/api/tasks/${ownTask.id}/comments`).set(as(member)).send({ body: 'hi' })
    assert.equal(ok.status, 201)
    const row = await prisma.comment.findUnique({ where: { id: ok.body.data.id } })
    assert.equal(row.authorId, member.id)
  })
})

describe('Viewer is read-only', () => {
  test('can read projects, team, tasks and comments', async () => {
    for (const path of [
      '/api/projects',
      `/api/projects/${project.id}`,
      `/api/projects/${project.id}/members`,
      `/api/projects/${project.id}/tasks`,
      `/api/tasks/${ownTask.id}`,
      `/api/tasks/${ownTask.id}/comments`,
    ]) {
      assert.equal((await request(app).get(path).set(as(viewer))).status, 200, path)
    }
  })

  test('every write is rejected (403) and nothing changes', async () => {
    const comment = await prisma.comment.create({ data: { taskId: ownTask.id, authorId: member.id, body: 'keep' } })
    const calls = [
      () => request(app).post('/api/projects').send({ name: 'X' }),
      () => request(app).patch(`/api/projects/${project.id}`).send({ name: 'X' }),
      () => request(app).delete(`/api/projects/${project.id}`),
      () => request(app).post(`/api/projects/${project.id}/members`).send({ userId: outsider.id }),
      () => request(app).delete(`/api/projects/${project.id}/members/${member.id}`),
      () => request(app).post(`/api/projects/${project.id}/tasks`).send({ title: 'X' }),
      () => request(app).patch(`/api/tasks/${ownTask.id}`).send({ version: 1, status: 'DONE' }),
      () => request(app).delete(`/api/tasks/${ownTask.id}`),
      () => request(app).post(`/api/tasks/${ownTask.id}/comments`).send({ body: 'X' }),
      () => request(app).delete(`/api/tasks/${ownTask.id}/comments/${comment.id}`),
      () =>
        request(app).post('/api/users').send({ name: 'X', email: 'x@test.local', password: 'Strong-pass-1', role: 'VIEWER' }),
      () => request(app).patch(`/api/users/${viewer.id}`).send({ role: 'ADMIN' }),
    ]
    for (const call of calls) assert.equal((await call().set(as(viewer))).status, 403)

    await assertUnchanged(ownTask)
    assert.equal(await prisma.comment.count(), 1)
    assert.equal(await prisma.project.count(), 2)
    assert.equal(await prisma.projectMember.count(), 2)
    assert.equal((await prisma.user.findUnique({ where: { id: viewer.id } })).role, 'VIEWER')
  })
})

describe('identity cannot be chosen by the client', () => {
  test('user ids in query strings or headers do not change who the caller is', async () => {
    const res = await request(app)
      .get(`/api/auth/me?userId=${admin.id}`)
      .set(as(viewer))
      .set('X-User-Id', String(admin.id))
      .set('X-Dev-User-Id', String(admin.id))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.id, viewer.id)
    assert.equal(res.body.data.role, 'VIEWER')
  })

  test('without a session, every protected endpoint is 401', async () => {
    const calls = [
      request(app).get('/api/projects'),
      request(app).get(`/api/tasks/${ownTask.id}`),
      request(app).get('/api/users'),
      request(app).post('/api/projects').send({ name: 'X' }),
      request(app).patch(`/api/tasks/${ownTask.id}`).send({ version: 1, status: 'DONE' }),
    ]
    for (const call of calls) assert.equal((await call).status, 401)
  })
})
