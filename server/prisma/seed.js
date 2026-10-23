// Development seed data for Phase 1 (users, projects, memberships).
//
// Run with:  npm run db:seed   (from the repo root or server/)
//
// Idempotent: running it again creates nothing new and never overwrites
// existing rows (users are matched by email, projects by name, memberships
// by the (projectId, userId) unique key). No passwords are created: login
// arrives in Phase 3.
import { pathToFileURL } from 'node:url'
import { prisma } from '../src/config/prisma.js'

export const SEED_USERS = [
  { name: 'Ada Admin', email: 'admin@neostats.local', role: 'ADMIN' },
  { name: 'Priya Sharma', email: 'priya.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { name: 'Marcus Lee', email: 'marcus.pm@neostats.local', role: 'PROJECT_MANAGER' },
  { name: 'Aisha Khan', email: 'aisha@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Ben Carter', email: 'ben@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Chloe Martin', email: 'chloe@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Diego Ramos', email: 'diego@neostats.local', role: 'TEAM_MEMBER' },
  { name: 'Vera Viewer', email: 'viewer@neostats.local', role: 'VIEWER' },
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

export async function runSeed(client = prisma) {
  const counts = { usersCreated: 0, projectsCreated: 0, membershipsCreated: 0 }
  const userIdByEmail = new Map()

  for (const user of SEED_USERS) {
    const email = user.email.trim().toLowerCase()
    const existing = await client.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      userIdByEmail.set(email, existing.id) // keep existing data untouched
      continue
    }
    const created = await client.user.create({ data: { ...user, email }, select: { id: true } })
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

    for (const member of project.members) {
      const userId = userIdByEmail.get(member.email)
      const key = { projectId_userId: { projectId: record.id, userId } }
      const exists = await client.projectMember.findUnique({ where: key, select: { id: true } })
      if (exists) continue
      await client.projectMember.create({ data: { projectId: record.id, userId, role: member.role } })
      counts.membershipsCreated++
    }
  }

  return counts
}

// Run only when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const counts = await runSeed()
    console.log('Seed complete:', counts)
    console.log('Development users (no passwords; pick them in the app header):')
    for (const u of SEED_USERS) console.log(`  ${u.role.padEnd(16)} ${u.name.padEnd(14)} ${u.email}`)
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}
