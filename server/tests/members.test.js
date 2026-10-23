import assert from 'node:assert/strict'
import { after, beforeEach, describe, test } from 'node:test'
import request from 'supertest'
import app from '../src/app.js'
import { as, createProject, createUser, prisma, resetDatabase } from './helpers/db.js'

let admin, pm, otherPm, member, member2, viewer, project

beforeEach(async () => {
  await resetDatabase()
  admin = await createUser('ADMIN')
  pm = await createUser('PROJECT_MANAGER')
  otherPm = await createUser('PROJECT_MANAGER')
  member = await createUser('TEAM_MEMBER')
  member2 = await createUser('TEAM_MEMBER')
  viewer = await createUser('VIEWER')
  project = await createProject({ managerId: pm.id })
})

after(() => prisma.$disconnect())

const membersUrl = () => `/api/projects/${project.id}/members`

describe('GET /api/projects/:id/members', () => {
  test('lists members with their user info and project role', async () => {
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id, role: 'VIEWER' } })
    const res = await request(app).get(membersUrl()).set(as(pm))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.length, 1)
    assert.equal(res.body.data[0].user.id, member.id)
    assert.equal(res.body.data[0].user.name, member.name)
    assert.equal(res.body.data[0].role, 'VIEWER')
  })

  test('a member can see their teammates; a Viewer can read the team', async () => {
    await prisma.projectMember.createMany({
      data: [
        { projectId: project.id, userId: member.id },
        { projectId: project.id, userId: member2.id },
      ],
    })
    const asMember = await request(app).get(membersUrl()).set(as(member))
    assert.equal(asMember.body.data.length, 2)
    const asViewer = await request(app).get(membersUrl()).set(as(viewer))
    assert.equal(asViewer.status, 200)
  })

  test('an outsider Team Member gets 403; a missing project gets 404', async () => {
    const outsider = await request(app).get(membersUrl()).set(as(member))
    assert.equal(outsider.status, 403)
    const missing = await request(app).get('/api/projects/999999/members').set(as(admin))
    assert.equal(missing.status, 404)
  })
})

describe('POST /api/projects/:id/members', () => {
  test('the PM adds a Team Member (default role MEMBER); it is persisted', async () => {
    const res = await request(app).post(membersUrl()).set(as(pm)).send({ userId: member.id })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.user.id, member.id)
    assert.equal(res.body.data.role, 'MEMBER')
    assert.equal(await prisma.projectMember.count({ where: { projectId: project.id, userId: member.id } }), 1)
  })

  test('Admin can add a member with a project role', async () => {
    const res = await request(app).post(membersUrl()).set(as(admin)).send({ userId: member.id, role: 'VIEWER' })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.role, 'VIEWER')
  })

  test('rejects a duplicate membership with 409', async () => {
    await request(app).post(membersUrl()).set(as(pm)).send({ userId: member.id })
    const res = await request(app).post(membersUrl()).set(as(pm)).send({ userId: member.id })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'ALREADY_MEMBER')
    assert.equal(await prisma.projectMember.count(), 1)
  })

  test('only TEAM_MEMBER users can be added', async () => {
    for (const user of [admin, otherPm, viewer]) {
      const res = await request(app).post(membersUrl()).set(as(pm)).send({ userId: user.id })
      assert.equal(res.status, 400, `${user.role} should not be addable`)
      assert.equal(res.body.error.code, 'INVALID_MEMBER')
    }
    assert.equal(await prisma.projectMember.count(), 0)
  })

  test('rejects a nonexistent user, a deactivated user and invalid input', async () => {
    const missing = await request(app).post(membersUrl()).set(as(pm)).send({ userId: 99999 })
    assert.equal(missing.status, 400)
    const inactive = await createUser('TEAM_MEMBER', { isActive: false })
    const res = await request(app).post(membersUrl()).set(as(pm)).send({ userId: inactive.id })
    assert.equal(res.status, 400)
    const bad = await request(app).post(membersUrl()).set(as(pm)).send({ userId: 'abc' })
    assert.equal(bad.status, 400)
    assert.equal(bad.body.error.code, 'VALIDATION_ERROR')
    const badRole = await request(app).post(membersUrl()).set(as(pm)).send({ userId: member.id, role: 'OWNER' })
    assert.equal(badRole.status, 400)
  })

  test('another PM, a Team Member and a Viewer cannot add members (403)', async () => {
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
    for (const user of [otherPm, member, viewer]) {
      const res = await request(app).post(membersUrl()).set(as(user)).send({ userId: member2.id })
      assert.equal(res.status, 403, `${user.role} should be forbidden`)
    }
  })

  test('archived projects reject team changes with 409', async () => {
    await prisma.project.update({ where: { id: project.id }, data: { status: 'ARCHIVED' } })
    const res = await request(app).post(membersUrl()).set(as(pm)).send({ userId: member.id })
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'PROJECT_ARCHIVED')
  })
})

describe('PATCH /api/projects/:id/members/:userId', () => {
  test('changes the project-level role', async () => {
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
    const res = await request(app).patch(`${membersUrl()}/${member.id}`).set(as(pm)).send({ role: 'VIEWER' })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.role, 'VIEWER')
  })

  test('returns 404 when the user is not a member', async () => {
    const res = await request(app).patch(`${membersUrl()}/${member.id}`).set(as(pm)).send({ role: 'VIEWER' })
    assert.equal(res.status, 404)
    assert.equal(res.body.error.code, 'MEMBER_NOT_FOUND')
  })
})

describe('DELETE /api/projects/:id/members/:userId', () => {
  test('removes the membership but keeps the user', async () => {
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
    const res = await request(app).delete(`${membersUrl()}/${member.id}`).set(as(pm))
    assert.equal(res.status, 200)
    assert.equal(await prisma.projectMember.count({ where: { projectId: project.id } }), 0)
    const user = await prisma.user.findUnique({ where: { id: member.id } })
    assert.ok(user, 'the user must still exist')
    assert.equal(user.isActive, true)
  })

  test('returns 404 when the user is not a member', async () => {
    const res = await request(app).delete(`${membersUrl()}/${member.id}`).set(as(pm))
    assert.equal(res.status, 404)
  })

  test('a Team Member cannot remove teammates (403)', async () => {
    await prisma.projectMember.createMany({
      data: [
        { projectId: project.id, userId: member.id },
        { projectId: project.id, userId: member2.id },
      ],
    })
    const res = await request(app).delete(`${membersUrl()}/${member2.id}`).set(as(member))
    assert.equal(res.status, 403)
    assert.equal(await prisma.projectMember.count(), 2)
  })
})
