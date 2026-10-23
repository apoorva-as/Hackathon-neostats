import { prisma } from '../../src/config/prisma.js'
import { AUTH_COOKIE, signAuthToken } from '../../src/utils/authToken.js'
import { hashPassword } from '../../src/utils/password.js'

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

// A user who can log in with `password` (hashing is slow, so only where needed).
export async function createUserWithPassword(role, password, overrides = {}) {
  return createUser(role, { passwordHash: await hashPassword(password), ...overrides })
}

// Cookie header for a request authenticated as `user`: a real signed session
// token, verified by the real requireAuth middleware (same as after a login).
export const sessionCookie = (user) => `${AUTH_COOKIE}=${signAuthToken(user)}`
export const as = (user) => ({ Cookie: sessionCookie(user) })

export { prisma }
