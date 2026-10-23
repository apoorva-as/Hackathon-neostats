import { prisma } from '../../src/config/prisma.js'

// Empties all app tables. Only ever runs against a *_test database.
export async function resetDatabase() {
  const [{ db }] = await prisma.$queryRaw`SELECT current_database() AS db`
  if (!db.endsWith('_test')) {
    throw new Error(`resetDatabase refused to run on "${db}" (not a _test database).`)
  }
  await prisma.$executeRaw`TRUNCATE TABLE comments, tasks, project_members, projects, users RESTART IDENTITY CASCADE`
}

let counter = 0
export function createUser(role, overrides = {}) {
  counter++
  return prisma.user.create({
    data: {
      name: `${role} ${counter}`,
      email: `${role.toLowerCase()}.${counter}@test.local`,
      role,
      ...overrides,
    },
  })
}

export function createProject(overrides = {}) {
  counter++
  return prisma.project.create({ data: { name: `Project ${counter}`, ...overrides } })
}

export function createTask(projectId, overrides = {}) {
  counter++
  return prisma.task.create({ data: { title: `Task ${counter}`, projectId, ...overrides } })
}

// Header used by the temporary development user switcher.
export const as = (user) => ({ 'X-Dev-User-Id': String(user.id) })

export { prisma }
