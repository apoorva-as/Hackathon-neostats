import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { after, beforeEach, describe, test } from 'node:test'
import { Prisma } from '@prisma/client'
import { runSeed, SEED_PROJECTS, SEED_TASKS, SEED_USERS } from '../prisma/seed.js'
import { createProject, createUser, prisma, resetDatabase } from './helpers/db.js'

beforeEach(() => resetDatabase())
after(() => prisma.$disconnect())

describe('Prisma schema', () => {
  test('prisma validate succeeds', () => {
    const result = spawnSync('npx', ['prisma', 'validate'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    assert.equal(result.status, 0, result.stderr)
  })
})

describe('relationships and constraints', () => {
  test('a project links to its manager and the manager lists managed projects', async () => {
    const pm = await createUser('PROJECT_MANAGER')
    const project = await createProject({ managerId: pm.id })
    const loaded = await prisma.project.findUnique({ where: { id: project.id }, include: { manager: true } })
    assert.equal(loaded.manager.id, pm.id)
    const withProjects = await prisma.user.findUnique({ where: { id: pm.id }, include: { managedProjects: true } })
    assert.deepEqual(withProjects.managedProjects.map((p) => p.id), [project.id])
  })

  test('a user can belong to many projects and a project has many users', async () => {
    const [u1, u2] = [await createUser('TEAM_MEMBER'), await createUser('TEAM_MEMBER')]
    const [p1, p2] = [await createProject(), await createProject()]
    await prisma.projectMember.createMany({
      data: [
        { projectId: p1.id, userId: u1.id },
        { projectId: p2.id, userId: u1.id },
        { projectId: p1.id, userId: u2.id },
      ],
    })
    const user = await prisma.user.findUnique({ where: { id: u1.id }, include: { memberships: true } })
    assert.equal(user.memberships.length, 2)
    const project = await prisma.project.findUnique({ where: { id: p1.id }, include: { members: true } })
    assert.equal(project.members.length, 2)
  })

  test('the unique (projectId, userId) constraint blocks duplicate memberships', async () => {
    const user = await createUser('TEAM_MEMBER')
    const project = await createProject()
    await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } })
    await assert.rejects(
      prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } }),
      (err) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002',
    )
  })

  test('emails are unique', async () => {
    await createUser('VIEWER', { email: 'same@test.local' })
    await assert.rejects(createUser('VIEWER', { email: 'same@test.local' }))
  })

  test('new users default to TEAM_MEMBER and active', async () => {
    const user = await prisma.user.create({ data: { name: 'Default', email: 'default@test.local' } })
    assert.equal(user.role, 'TEAM_MEMBER')
    assert.equal(user.isActive, true)
  })
})

describe('seed script', () => {
  test('creates all roles, projects and memberships', async () => {
    const counts = await runSeed(prisma)
    const expectedMemberships = SEED_PROJECTS.reduce((n, p) => n + p.members.length, 0)
    assert.deepEqual(counts, {
      usersCreated: SEED_USERS.length,
      passwordsSet: 0,
      projectsCreated: SEED_PROJECTS.length,
      membershipsCreated: expectedMemberships,
      tasksCreated: SEED_TASKS.length,
      commentsCreated: SEED_TASKS.reduce((n, t) => n + t.comments.length, 0),
    })
    const roles = await prisma.user.groupBy({ by: ['role'], _count: true })
    assert.equal(roles.length, 4)
    const managers = await prisma.project.findMany({ where: { managerId: { not: null } }, distinct: ['managerId'] })
    assert.ok(managers.length >= 2, 'projects are spread over at least two managers')
  })

  test('is repeatable: a second run creates nothing and keeps existing data', async () => {
    await runSeed(prisma)
    const admin = await prisma.user.findUnique({ where: { email: 'admin@neostats.local' } })
    await prisma.user.update({ where: { id: admin.id }, data: { name: 'Renamed By Hand' } })

    const second = await runSeed(prisma)
    assert.deepEqual(second, {
      usersCreated: 0,
      passwordsSet: 0,
      projectsCreated: 0,
      membershipsCreated: 0,
      tasksCreated: 0,
      commentsCreated: 0,
    })
    assert.equal(await prisma.task.count(), SEED_TASKS.length)
    assert.equal(await prisma.user.count(), SEED_USERS.length)
    assert.equal(await prisma.project.count(), SEED_PROJECTS.length)
    const after = await prisma.user.findUnique({ where: { id: admin.id } })
    assert.equal(after.name, 'Renamed By Hand', 'existing user data is not overwritten')
  })
})
