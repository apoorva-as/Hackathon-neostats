import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createProject, createTask, createUser, prisma, resetDatabase } from './helpers/db.js'

let admin, pm, otherPm, member, member2, readOnlyMember, outsider, viewer, project, task

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
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: member.id },
      { projectId: project.id, userId: member2.id },
      { projectId: project.id, userId: readOnlyMember.id, role: 'VIEWER' },
    ],
  })
  task = await createTask(project.id, { assigneeId: member.id })
})

after(() => prisma.$disconnect())

const commentsUrl = (t = task) => `/api/tasks/${t.id}/comments`
const addComment = (user, body = 'Hello') => prisma.comment.create({ data: { taskId: task.id, authorId: user.id, body } })

describe('POST /api/tasks/:id/comments', () => {
  test('a project member (not only the assignee) and the PM can comment; author comes from the server', async () => {
    for (const user of [member, member2, pm]) {
      const res = await request(app).post(commentsUrl()).set(as(user)).send({ body: `  from ${user.name}  ` })
      assert.equal(res.status, 201, user.name)
      assert.equal(res.body.data.author.id, user.id)
      assert.equal(res.body.data.body, `from ${user.name}`)
      assert.equal(res.body.data.canDelete, true)
    }
    assert.equal(await prisma.comment.count(), 3)
  })

  test('a client-supplied authorId is rejected', async () => {
    const res = await request(app).post(commentsUrl()).set(as(member)).send({ body: 'x', authorId: pm.id })
    assert.equal(res.status, 400)
    assert.equal(await prisma.comment.count(), 0)
  })

  test('Viewer, Admin, read-only member, outsider and other PM cannot comment', async () => {
    for (const user of [viewer, admin, readOnlyMember, outsider, otherPm]) {
      const res = await request(app).post(commentsUrl()).set(as(user)).send({ body: 'nope' })
      assert.equal(res.status, 403, user.name)
    }
    assert.equal(await prisma.comment.count(), 0)
  })

  test('rejects empty, whitespace-only, too long and missing bodies', async () => {
    for (const body of [{}, { body: '' }, { body: '    ' }, { body: 'x'.repeat(2001) }, { body: 42 }]) {
      const res = await request(app).post(commentsUrl()).set(as(member)).send(body)
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 40))
      assert.equal(res.body.error.code, 'VALIDATION_ERROR')
    }
  })

  test('missing task → 404; archived project → 409', async () => {
    const missing = await request(app).post('/api/tasks/999999/comments').set(as(member)).send({ body: 'x' })
    assert.equal(missing.status, 404)
    await prisma.project.update({ where: { id: project.id }, data: { status: 'ARCHIVED' } })
    const archived = await request(app).post(commentsUrl()).set(as(member)).send({ body: 'x' })
    assert.equal(archived.status, 409)
  })
})

describe('GET /api/tasks/:id/comments', () => {
  test('anyone who can see the project reads the thread, oldest first', async () => {
    await addComment(member, 'first')
    await addComment(pm, 'second')
    for (const user of [member, member2, readOnlyMember, pm, admin, viewer]) {
      const res = await request(app).get(commentsUrl()).set(as(user))
      assert.equal(res.status, 200, user.name)
      assert.deepEqual(res.body.data.map((c) => c.body), ['first', 'second'])
      assert.equal(res.body.meta.total, 2)
    }
  })

  test('outsiders get 403', async () => {
    await addComment(member)
    for (const user of [outsider, otherPm]) {
      assert.equal((await request(app).get(commentsUrl()).set(as(user))).status, 403)
    }
  })

  test('canDelete hint reflects who may delete', async () => {
    await addComment(member, 'mine')
    const asAuthor = await request(app).get(commentsUrl()).set(as(member))
    assert.equal(asAuthor.body.data[0].canDelete, true)
    const asTeammate = await request(app).get(commentsUrl()).set(as(member2))
    assert.equal(asTeammate.body.data[0].canDelete, false)
    const asViewer = await request(app).get(commentsUrl()).set(as(viewer))
    assert.equal(asViewer.body.data[0].canDelete, false)
  })
})

describe('DELETE /api/tasks/:id/comments/:commentId', () => {
  test('the author deletes their own comment', async () => {
    const comment = await addComment(member)
    const res = await request(app).delete(`${commentsUrl()}/${comment.id}`).set(as(member))
    assert.equal(res.status, 200)
    assert.equal(await prisma.comment.count(), 0)
  })

  test('the PM and an Admin can moderate any comment', async () => {
    const c1 = await addComment(member)
    const c2 = await addComment(member2)
    assert.equal((await request(app).delete(`${commentsUrl()}/${c1.id}`).set(as(pm))).status, 200)
    assert.equal((await request(app).delete(`${commentsUrl()}/${c2.id}`).set(as(admin))).status, 200)
  })

  test('teammates and Viewers cannot delete others\' comments', async () => {
    const comment = await addComment(member)
    for (const user of [member2, viewer, readOnlyMember]) {
      assert.equal((await request(app).delete(`${commentsUrl()}/${comment.id}`).set(as(user))).status, 403, user.name)
    }
    assert.equal(await prisma.comment.count(), 1)
  })

  test('a comment cannot be deleted through another task\'s URL (404)', async () => {
    const comment = await addComment(member)
    const otherTask = await createTask(project.id)
    const res = await request(app).delete(`${commentsUrl(otherTask)}/${comment.id}`).set(as(member))
    assert.equal(res.status, 404)
    assert.equal(res.body.error.code, 'COMMENT_NOT_FOUND')
    assert.equal(await prisma.comment.count(), 1)
  })

  test('missing comment → 404, invalid id → 400', async () => {
    assert.equal((await request(app).delete(`${commentsUrl()}/999999`).set(as(pm))).status, 404)
    assert.equal((await request(app).delete(`${commentsUrl()}/abc`).set(as(pm))).status, 400)
  })
})
