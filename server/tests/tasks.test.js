import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createProject, createTask, createUser, prisma, resetDatabase } from './helpers/db.js'

// project: managed by pm; member + member2 work on it (MEMBER), readOnlyMember is a VIEWER member.
// otherProject: managed by otherPm; outsider works on it.
let admin, pm, otherPm, member, member2, readOnlyMember, outsider, viewer, project, otherProject

beforeEach(async () => {
  await resetDatabase()
  admin = await createUser('ADMIN')
  pm = await createUser('PROJECT_MANAGER')
  otherPm = await createUser('PROJECT_MANAGER')
  member = await createUser('TEAM_MEMBER')
  member2 = await createUser('TEAM_MEMBER')
  readOnlyMember = await createUser('TEAM_MEMBER')
  outsider = await createUser('TEAM_MEMBER')
  viewer = await createUser('VIEWER')
  project = await createProject({ managerId: pm.id })
  otherProject = await createProject({ managerId: otherPm.id })
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: member.id },
      { projectId: project.id, userId: member2.id },
      { projectId: project.id, userId: readOnlyMember.id, role: 'VIEWER' },
      { projectId: otherProject.id, userId: outsider.id },
    ],
  })
})

after(() => prisma.$disconnect())

const tasksUrl = (p = project) => `/api/projects/${p.id}/tasks`
const taskUrl = (t) => `/api/tasks/${t.id}`

describe('POST /api/projects/:id/tasks', () => {
  test('the PM creates a task with defaults and version 1', async () => {
    const res = await request(app).post(tasksUrl()).set(as(pm)).send({ title: '  Write spec  ' })
    assert.equal(res.status, 201)
    const task = res.body.data
    assert.equal(task.title, 'Write spec')
    assert.equal(task.status, 'TODO')
    assert.equal(task.priority, 'MEDIUM')
    assert.equal(task.version, 1)
    assert.equal(task.assignee, null)
    assert.equal(task.dueDate, null)
    assert.equal(task.projectId, project.id)
    assert.equal(task.permissions.canDelete, true)
    assert.equal(await prisma.task.count(), 1)
  })

  test('creates a fully specified task assigned to a project member', async () => {
    const res = await request(app).post(tasksUrl()).set(as(pm)).send({
      title: 'Build API',
      description: 'Express routes',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '2026-12-24',
      assigneeId: member.id,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.assignee.id, member.id)
    assert.equal(res.body.data.dueDate, '2026-12-24')
    assert.equal(res.body.data.priority, 'HIGH')
  })

  test('rejects invalid assignees with 400 INVALID_ASSIGNEE', async () => {
    const inactive = await createUser('TEAM_MEMBER', { isActive: false })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: inactive.id } })
    const cases = [
      [outsider.id, 'Team Member from another project'],
      [readOnlyMember.id, 'read-only VIEWER member'],
      [viewer.id, 'global Viewer'],
      [otherPm.id, 'Project Manager'],
      [admin.id, 'Admin'],
      [inactive.id, 'deactivated member'],
      [999999, 'nonexistent user'],
    ]
    for (const [assigneeId, label] of cases) {
      const res = await request(app).post(tasksUrl()).set(as(pm)).send({ title: 'X', assigneeId })
      assert.equal(res.status, 400, label)
      assert.equal(res.body.error.code, 'INVALID_ASSIGNEE', label)
    }
    assert.equal(await prisma.task.count(), 0)
  })

  test('validates input', async () => {
    const bad = [
      {},
      { title: '   ' },
      { title: 'x'.repeat(201) },
      { title: 'A', status: 'BLOCKED' },
      { title: 'A', priority: 'URGENT' },
      { title: 'A', dueDate: '24/12/2026' },
      { title: 'A', assigneeId: 'abc' },
      { title: 'A', version: 3 },
      { title: 'A', projectId: 99 },
    ]
    for (const body of bad) {
      const res = await request(app).post(tasksUrl()).set(as(pm)).send(body)
      assert.equal(res.status, 400, JSON.stringify(body))
      assert.equal(res.body.error.code, 'VALIDATION_ERROR')
    }
  })

  test('only the project manager may create tasks (403 for everyone else)', async () => {
    for (const user of [admin, otherPm, member, viewer]) {
      const res = await request(app).post(tasksUrl()).set(as(user)).send({ title: 'Nope' })
      assert.equal(res.status, 403, `${user.role} ${user.name}`)
    }
    assert.equal(await prisma.task.count(), 0)
  })

  test('missing project → 404, archived project → 409, no user header → 401', async () => {
    const missing = await request(app).post('/api/projects/999999/tasks').set(as(pm)).send({ title: 'A' })
    assert.equal(missing.status, 404)
    await prisma.project.update({ where: { id: project.id }, data: { status: 'ARCHIVED' } })
    const archived = await request(app).post(tasksUrl()).set(as(pm)).send({ title: 'A' })
    assert.equal(archived.status, 409)
    assert.equal(archived.body.error.code, 'PROJECT_ARCHIVED')
    const anon = await request(app).post(tasksUrl()).send({ title: 'A' })
    assert.equal(anon.status, 401)
  })
})

describe('reading tasks', () => {
  test('project task list: visible to its PM, members, Admin and Viewer; filters and paginates', async () => {
    await createTask(project.id, { status: 'DONE', assigneeId: member.id })
    await createTask(project.id, { status: 'TODO', priority: 'HIGH' })
    await createTask(otherProject.id)

    for (const user of [pm, member, readOnlyMember, admin, viewer]) {
      const res = await request(app).get(tasksUrl()).set(as(user))
      assert.equal(res.status, 200, user.name)
      assert.equal(res.body.data.length, 2)
      assert.equal(res.body.meta.total, 2)
    }
    const done = await request(app).get(`${tasksUrl()}?status=DONE`).set(as(pm))
    assert.equal(done.body.data.length, 1)
    const mine = await request(app).get(`${tasksUrl()}?assigneeId=${member.id}`).set(as(pm))
    assert.equal(mine.body.data.length, 1)
    const paged = await request(app).get(`${tasksUrl()}?limit=1&page=2`).set(as(pm))
    assert.equal(paged.body.data.length, 1)
    assert.equal(paged.body.meta.totalPages, 2)
    const badFilter = await request(app).get(`${tasksUrl()}?status=NOPE`).set(as(pm))
    assert.equal(badFilter.status, 400)
  })

  test('project boundary: outsiders and other PMs get 403', async () => {
    const task = await createTask(project.id)
    for (const user of [outsider, otherPm]) {
      assert.equal((await request(app).get(tasksUrl()).set(as(user))).status, 403)
      assert.equal((await request(app).get(taskUrl(task)).set(as(user))).status, 403)
    }
  })

  test('GET /api/tasks only returns tasks from visible projects; assigneeId gives "my tasks"', async () => {
    await createTask(project.id, { assigneeId: member.id })
    await createTask(project.id)
    await createTask(otherProject.id, { assigneeId: outsider.id })

    const asMember = await request(app).get('/api/tasks').set(as(member))
    assert.equal(asMember.body.meta.total, 2)
    const mine = await request(app).get(`/api/tasks?assigneeId=${member.id}`).set(as(member))
    assert.equal(mine.body.meta.total, 1)
    const asOtherPm = await request(app).get('/api/tasks').set(as(otherPm))
    assert.equal(asOtherPm.body.meta.total, 1)
    const asAdmin = await request(app).get('/api/tasks').set(as(admin))
    assert.equal(asAdmin.body.meta.total, 3)
    // Filtering by someone else's project returns nothing rather than leaking it.
    const leak = await request(app).get(`/api/tasks?projectId=${otherProject.id}`).set(as(member))
    assert.equal(leak.body.meta.total, 0)
  })

  test('GET /api/tasks/:id returns the task with role-specific permissions', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    const asPm = (await request(app).get(taskUrl(task)).set(as(pm))).body.data
    assert.equal(asPm.permissions.canAssign, true)
    assert.equal(asPm.permissions.canDelete, true)
    const asAssignee = (await request(app).get(taskUrl(task)).set(as(member))).body.data
    assert.deepEqual(asAssignee.permissions.editableFields, ['status', 'description'])
    assert.equal(asAssignee.permissions.canDelete, false)
    assert.equal(asAssignee.permissions.canComment, true)
    const asTeammate = (await request(app).get(taskUrl(task)).set(as(member2))).body.data
    assert.equal(asTeammate.permissions.canEdit, false)
    assert.equal(asTeammate.permissions.canComment, true)
    const asViewer = (await request(app).get(taskUrl(task)).set(as(viewer))).body.data
    assert.equal(asViewer.permissions.canEdit, false)
    assert.equal(asViewer.permissions.canComment, false)
  })

  test('missing task → 404, invalid id → 400', async () => {
    const missing = await request(app).get('/api/tasks/999999').set(as(admin))
    assert.equal(missing.status, 404)
    assert.equal(missing.body.error.code, 'TASK_NOT_FOUND')
    assert.equal((await request(app).get('/api/tasks/abc').set(as(admin))).status, 400)
  })
})

describe('PATCH /api/tasks/:id', () => {
  test('the PM updates any field; version increments', async () => {
    const task = await createTask(project.id)
    const res = await request(app).patch(taskUrl(task)).set(as(pm)).send({
      version: 1,
      title: 'Renamed',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      dueDate: '2027-01-05',
      assigneeId: member.id,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.title, 'Renamed')
    assert.equal(res.body.data.assignee.id, member.id)
    assert.equal(res.body.data.version, 2)

    const reassigned = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 2, assigneeId: member2.id })
    assert.equal(reassigned.body.data.assignee.id, member2.id)
    const cleared = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 3, assigneeId: null, dueDate: null })
    assert.equal(cleared.body.data.assignee, null)
    assert.equal(cleared.body.data.dueDate, null)
    assert.equal(cleared.body.data.version, 4)
  })

  test('the PM cannot reassign to an ineligible user', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    for (const assigneeId of [outsider.id, readOnlyMember.id, viewer.id]) {
      const res = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 1, assigneeId })
      assert.equal(res.status, 400)
      assert.equal(res.body.error.code, 'INVALID_ASSIGNEE')
    }
    const unchanged = await prisma.task.findUnique({ where: { id: task.id } })
    assert.equal(unchanged.assigneeId, member.id)
    assert.equal(unchanged.version, 1)
  })

  test('the assignee may change status and description only', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    const ok = await request(app).patch(taskUrl(task)).set(as(member)).send({ version: 1, status: 'DONE', description: 'Finished' })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.data.status, 'DONE')
    assert.equal(ok.body.data.version, 2)

    for (const body of [{ title: 'Mine now' }, { priority: 'HIGH' }, { assigneeId: member2.id }, { dueDate: '2027-01-01' }]) {
      const res = await request(app).patch(taskUrl(task)).set(as(member)).send({ version: 2, ...body })
      assert.equal(res.status, 403, JSON.stringify(body))
    }
    const stored = await prisma.task.findUnique({ where: { id: task.id } })
    assert.equal(stored.version, 2)
    assert.equal(stored.assigneeId, member.id)
  })

  test('teammates, read-only members, Viewers, Admins and other PMs cannot edit', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    // A read-only member is forbidden even if a task is (somehow) assigned to them.
    const legacy = await createTask(project.id, { assigneeId: readOnlyMember.id })
    for (const user of [member2, viewer, admin, otherPm, outsider]) {
      const res = await request(app).patch(taskUrl(task)).set(as(user)).send({ version: 1, status: 'DONE' })
      assert.equal(res.status, 403, user.name)
    }
    const res = await request(app).patch(taskUrl(legacy)).set(as(readOnlyMember)).send({ version: 1, status: 'DONE' })
    assert.equal(res.status, 403)
    assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).status, 'TODO')
  })

  test('validates the body: version required, unknown fields and empty updates rejected', async () => {
    const task = await createTask(project.id)
    const cases = [{ title: 'No version' }, { version: 1 }, { version: '1', title: 'A' }, { version: 0, title: 'A' }, { version: 1, foo: 1 }]
    for (const body of cases) {
      const res = await request(app).patch(taskUrl(task)).set(as(pm)).send(body)
      assert.equal(res.status, 400, JSON.stringify(body))
    }
    const missing = await request(app).patch('/api/tasks/999999').set(as(pm)).send({ version: 1, title: 'A' })
    assert.equal(missing.status, 404)
  })

  test('tasks of an archived project are read-only (409)', async () => {
    const task = await createTask(project.id)
    await prisma.project.update({ where: { id: project.id }, data: { status: 'ARCHIVED' } })
    const res = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 1, status: 'DONE' })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'PROJECT_ARCHIVED')
  })
})

describe('optimistic concurrency (409 VERSION_CONFLICT)', () => {
  test('a stale version is rejected with 409 and the latest task; nothing is overwritten', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    // Both users loaded version 1. The PM saves first → version 2.
    const first = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 1, title: 'PM title' })
    assert.equal(first.status, 200)
    assert.equal(first.body.data.version, 2)

    // The assignee saves based on the old version 1 → conflict.
    const stale = await request(app).patch(taskUrl(task)).set(as(member)).send({ version: 1, status: 'DONE' })
    assert.equal(stale.status, 409)
    assert.equal(stale.body.success, false)
    assert.equal(stale.body.error.code, 'VERSION_CONFLICT')
    assert.equal(stale.body.error.currentVersion, 2)
    assert.equal(stale.body.error.currentTask.title, 'PM title')

    const stored = await prisma.task.findUnique({ where: { id: task.id } })
    assert.equal(stored.status, 'TODO', 'the stale change was not applied')
    assert.equal(stored.version, 2)

    // After reloading (version 2) the same change succeeds.
    const retry = await request(app).patch(taskUrl(task)).set(as(member)).send({ version: 2, status: 'DONE' })
    assert.equal(retry.status, 200)
    assert.equal(retry.body.data.version, 3)
  })

  test('a version from the future is also a conflict', async () => {
    const task = await createTask(project.id)
    const res = await request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 5, title: 'A' })
    assert.equal(res.status, 409)
  })

  test('two simultaneous updates with the same version: exactly one succeeds', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    const results = await Promise.all([
      request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 1, priority: 'HIGH' }),
      request(app).patch(taskUrl(task)).set(as(member)).send({ version: 1, status: 'IN_PROGRESS' }),
      request(app).patch(taskUrl(task)).set(as(pm)).send({ version: 1, title: 'Third writer' }),
    ])
    const statuses = results.map((r) => r.status).sort()
    assert.deepEqual(statuses, [200, 409, 409])
    const stored = await prisma.task.findUnique({ where: { id: task.id } })
    assert.equal(stored.version, 2, 'exactly one write was applied')
  })

  test('removing a member unassigns their tasks and bumps the version', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    await request(app).delete(`/api/projects/${project.id}/members/${member.id}`).set(as(pm)).expect(200)
    const stored = await prisma.task.findUnique({ where: { id: task.id } })
    assert.equal(stored.assigneeId, null)
    assert.equal(stored.version, 2)
    // The removed member now has no access at all.
    assert.equal((await request(app).get(taskUrl(task)).set(as(member))).status, 403)
  })

  test('making a member read-only unassigns their tasks', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    await request(app).patch(`/api/projects/${project.id}/members/${member.id}`).set(as(pm)).send({ role: 'VIEWER' }).expect(200)
    assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).assigneeId, null)
  })
})

describe('DELETE /api/tasks/:id', () => {
  test('the PM deletes a task; its comments go with it', async () => {
    const task = await createTask(project.id)
    await prisma.comment.create({ data: { taskId: task.id, authorId: member.id, body: 'hi' } })
    const res = await request(app).delete(taskUrl(task)).set(as(pm))
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.data, { id: task.id })
    assert.equal(await prisma.task.count(), 0)
    assert.equal(await prisma.comment.count(), 0)
  })

  test('nobody else can delete (403); missing → 404', async () => {
    const task = await createTask(project.id, { assigneeId: member.id })
    for (const user of [member, viewer, admin, otherPm]) {
      assert.equal((await request(app).delete(taskUrl(task)).set(as(user))).status, 403, user.name)
    }
    assert.equal(await prisma.task.count(), 1)
    assert.equal((await request(app).delete('/api/tasks/999999').set(as(pm))).status, 404)
  })

  test('deleting a project cascades to its tasks and comments', async () => {
    const task = await createTask(project.id)
    await prisma.comment.create({ data: { taskId: task.id, authorId: pm.id, body: 'x' } })
    await request(app).delete(`/api/projects/${project.id}`).set(as(admin)).expect(200)
    assert.equal(await prisma.task.count(), 0)
    assert.equal(await prisma.comment.count(), 0)
    assert.equal(await prisma.user.count({ where: { id: member.id } }), 1)
  })
})
