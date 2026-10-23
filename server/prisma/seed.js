// Development seed data (users, projects, memberships, tasks, comments).
//
// Run with:  npm run db:seed   (from the repo root or server/)
//
// Idempotent: running it again creates nothing new and never overwrites
// existing rows (users are matched by email, projects by name, memberships
// by the (projectId, userId) unique key, tasks by (project, title), comments
// by (task, author, body)).
//
// Passwords (Phase 3, DEVELOPMENT ONLY): every demo account gets the demo
// password (SEED_DEMO_PASSWORD in server/.env, or DEFAULT_DEMO_PASSWORD
// below), stored only as a bcrypt hash. A password is set ONLY when the
// account has none yet, so existing passwords and roles are never overwritten.
// The seed refuses to run when NODE_ENV=production.
import { pathToFileURL } from 'node:url'
import { env, isProduction } from '../src/config/env.js'
import { prisma } from '../src/config/prisma.js'
import { hashPassword } from '../src/utils/password.js'

// Public, development-only demo password (documented in README.md).
export const DEFAULT_DEMO_PASSWORD = 'Neostats@123'

export const SEED_USERS = [
  { name: 'Ada Admin', email: 'admin@neostats.local', role: 'ADMIN' },
  { name: 'Priya Sharma', email: 'priya.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { name: 'Marcus Lee', email: 'marcus.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { name: 'Aisha Khan', email: 'aisha@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Ben Carter', email: 'ben@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Chloe Martin', email: 'chloe@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Diego Ramos', email: 'diego@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Vera Viewer', email: 'viewer@neostats.local', role: 'VIEWER' },
  // Deactivated account: shows that deactivated users cannot sign in.
  { name: 'Ivan Inactive', email: 'inactive@neostats.local', role: 'TEAM_MEMBER', isActive: false },
]

// managerEmail null = unassigned (lets the Admin demo manager assignment).
export const SEED_PROJECTS = [
  {
    name: 'Website Redesign',
    description: 'Refresh the public marketing site with the new brand and a faster CMS.',
    status: 'ACTIVE',
    managerEmail: 'priya.pm@neostats.local',
    members: [
      { email: 'aisha@neostats.local', role: 'MEMBER' },
      { email: 'ben@neostats.local', role: 'MEMBER' },
    ],
  },
  {
    name: 'Mobile App Launch',
    description: 'Ship v1 of the customer mobile app on iOS and Android.',
    status: 'ON_HOLD',
    managerEmail: 'priya.pm@neostats.local',
    members: [
      { email: 'ben@neostats.local', role: 'MEMBER' },
      { email: 'chloe@neostats.local', role: 'MEMBER' },
    ],
  },
  {
    name: 'Data Warehouse Migration',
    description: 'Move reporting from the legacy warehouse to PostgreSQL with dbt models.',
    status: 'ACTIVE',
    managerEmail: 'marcus.pm@neostats.local',
    members: [
      { email: 'chloe@neostats.local', role: 'MEMBER' },
      { email: 'diego@neostats.local', role: 'VIEWER' },
    ],
  },
  {
    name: 'Customer Portal',
    description: 'Self-service portal for invoices and support tickets. Needs a manager.',
    status: 'ACTIVE',
    managerEmail: null,
    members: [],
  },
  {
    name: 'Legacy CRM Sunset',
    description: 'Decommission the old CRM after the data export. Kept for reference.',
    status: 'ARCHIVED',
    managerEmail: 'marcus.pm@neostats.local',
    members: [{ email: 'aisha@neostats.local', role: 'MEMBER' }],
  },
]

// Assignees are always project MEMBERs (never read-only VIEWER members).
export const SEED_TASKS = [
  {
    project: 'Website Redesign',
    title: 'Design new homepage hero',
    description: 'Mockups for desktop and mobile using the new brand palette.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-11-15',
    assigneeEmail: 'aisha@neostats.local',
    comments: [
      { email: 'priya.pm@neostats.local', body: 'Please share a first draft by Friday.' },
      { email: 'aisha@neostats.local', body: 'Draft is in Figma, link in the description soon.' },
    ],
  },
  {
    project: 'Website Redesign',
    title: 'Migrate blog posts to the new CMS',
    description: 'Export the 120 existing posts and import them with redirects.',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2026-12-01',
    assigneeEmail: 'ben@neostats.local',
    comments: [],
  },
  {
    project: 'Website Redesign',
    title: 'Set up analytics events',
    description: '',
    status: 'TODO',
    priority: 'LOW',
    dueDate: null,
    assigneeEmail: null,
    comments: [],
  },
  {
    project: 'Mobile App Launch',
    title: 'App store screenshots',
    description: 'Five screenshots per platform.',
    status: 'DONE',
    priority: 'MEDIUM',
    dueDate: '2026-10-20',
    assigneeEmail: 'chloe@neostats.local',
    comments: [{ email: 'ben@neostats.local', body: 'Looks great, approved.' }],
  },
  {
    project: 'Data Warehouse Migration',
    title: 'Write dbt models for revenue reports',
    description: 'Port the three legacy revenue views to dbt.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-11-30',
    assigneeEmail: 'chloe@neostats.local',
    comments: [],
  },
]

export async function runSeed(client = prisma, { password = env.SEED_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD } = {}) {
  if (isProduction) {
    throw new Error('Refusing to seed demo accounts when NODE_ENV=production.')
  }
  const counts = {
    usersCreated: 0,
    passwordsSet: 0,
    projectsCreated: 0,
    membershipsCreated: 0,
    tasksCreated: 0,
    commentsCreated: 0,
  }
  const projectIdByName = new Map()
  const userIdByEmail = new Map()

  for (const user of SEED_USERS) {
    const email = user.email.trim().toLowerCase()
    const existing = await client.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
    if (existing) {
      userIdByEmail.set(email, existing.id)
      // Keep name/role/active flag untouched; only fill in a MISSING password
      // (accounts seeded before Phase 3 have none and could not log in).
      if (!existing.passwordHash) {
        await client.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(password) } })
        counts.passwordsSet++
      }
      continue
    }
    const created = await client.user.create({
      data: { ...user, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    })
    userIdByEmail.set(email, created.id)
    counts.usersCreated++
  }

  for (const project of SEED_PROJECTS) {
    let record = await client.project.findFirst({ where: { name: project.name }, select: { id: true } })
    if (!record) {
      record = await client.project.create({
        data: {
          name: project.name,
          description: project.description,
          status: project.status,
          archivedAt: project.status === 'ARCHIVED' ? new Date() : null,
          managerId: project.managerEmail ? userIdByEmail.get(project.managerEmail) : null,
        },
        select: { id: true },
      })
      counts.projectsCreated++
    }
    projectIdByName.set(project.name, record.id)

    for (const member of project.members) {
      const userId = userIdByEmail.get(member.email)
      const key = { projectId_userId: { projectId: record.id, userId } }
      const exists = await client.projectMember.findUnique({ where: key, select: { id: true } })
      if (exists) continue
      await client.projectMember.create({ data: { projectId: record.id, userId, role: member.role } })
      counts.membershipsCreated++
    }
  }

  for (const task of SEED_TASKS) {
    const projectId = projectIdByName.get(task.project)
    let record = await client.task.findFirst({ where: { projectId, title: task.title }, select: { id: true } })
    if (!record) {
      record = await client.task.create({
        data: {
          projectId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(`${task.dueDate}T00:00:00.000Z`) : null,
          assigneeId: task.assigneeEmail ? userIdByEmail.get(task.assigneeEmail) : null,
        },
        select: { id: true },
      })
      counts.tasksCreated++
    }

    for (const comment of task.comments) {
      const authorId = userIdByEmail.get(comment.email)
      const exists = await client.comment.findFirst({
        where: { taskId: record.id, authorId, body: comment.body },
        select: { id: true },
      })
      if (exists) continue
      await client.comment.create({ data: { taskId: record.id, authorId, body: comment.body } })
      counts.commentsCreated++
    }
  }

  return counts
}

// Run only when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const counts = await runSeed()
    console.log('Seed complete:', counts)
    console.log('Development accounts (sign in with the demo password documented in README.md):')
    for (const u of SEED_USERS) {
      const note = u.isActive === false ? ' (deactivated)' : ''
      console.log(`  ${u.role.padEnd(16)} ${u.name.padEnd(14)} ${u.email}${note}`)
    }
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}
