import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { canListUsers, ROLES } from '../policies/project.policy.js'
import { canManageUsers, selfChangeViolation } from '../policies/user.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { pageMeta, paginate } from '../utils/pagination.js'
import { hashPassword } from '../utils/password.js'

// The only user fields the directory returns (no secrets, ever).
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
}

// Safe fields for the signed-in user and for Admin user management.
// passwordHash and tokenVersion are never selected for responses.
export const authUserSelect = { ...publicUserSelect, createdAt: true }

// Emails are stored trimmed and lowercase so "Ana@X.com " and "ana@x.com" match.
export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

const isUniqueViolation = (err) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'

function assertCanManageUsers(actor) {
  if (!canManageUsers(actor)) {
    throw new ApiError(403, 'Only an Admin can manage users.', 'FORBIDDEN')
  }
}

// GET /api/users: user directory for picking managers and members.
export async function listUsers(actor, query) {
  if (!canListUsers(actor)) {
    throw new ApiError(403, 'You do not have permission to list users.', 'FORBIDDEN')
  }

  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      ...paginate(query),
    }),
  ])

  return { users, meta: pageMeta(query, total) }
}

// GET /api/users/:id (Admin)
export async function getUser(actor, id) {
  assertCanManageUsers(actor)
  const user = await prisma.user.findUnique({ where: { id }, select: authUserSelect })
  if (!user) throw new ApiError(404, `User ${id} was not found.`, 'USER_NOT_FOUND')
  return user
}

// POST /api/users (Admin). The password is hashed before it reaches the database.
export async function createUser(actor, data) {
  assertCanManageUsers(actor)
  const passwordHash = await hashPassword(data.password)
  try {
    return await prisma.user.create({
      data: { name: data.name, email: normalizeEmail(data.email), role: data.role, passwordHash },
      select: authUserSelect,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A user with this email already exists.', 'EMAIL_TAKEN')
    }
    throw err
  }
}

// A role change must not break the project rules: a project's manager must
// be a PROJECT_MANAGER and team members must be TEAM_MEMBERs. So a user who
// still manages projects / belongs to teams must be unassigned first.
async function assertRoleChangeAllowed(tx, user, newRole) {
  if (user.role === ROLES.PROJECT_MANAGER && newRole !== ROLES.PROJECT_MANAGER) {
    const managed = await tx.project.count({ where: { managerId: user.id } })
    if (managed > 0) {
      throw new ApiError(
        409,
        `This user manages ${managed} project(s). Assign another manager before changing the role.`,
        'USER_HAS_ASSIGNMENTS',
      )
    }
  }
  if (user.role === ROLES.TEAM_MEMBER && newRole !== ROLES.TEAM_MEMBER) {
    const memberships = await tx.projectMember.count({ where: { userId: user.id } })
    if (memberships > 0) {
      throw new ApiError(
        409,
        `This user belongs to ${memberships} project team(s). Remove them from those teams before changing the role.`,
        'USER_HAS_ASSIGNMENTS',
      )
    }
  }
}

// PATCH /api/users/:id (Admin): name, email, role, isActive (deactivate /
// reactivate) and password reset. Deactivating or resetting a password also
// increments tokenVersion, which signs the user out everywhere immediately.
export async function updateUser(actor, id, changes) {
  assertCanManageUsers(actor)
  const selfError = selfChangeViolation(actor, id, changes)
  if (selfError) throw new ApiError(403, selfError, 'FORBIDDEN')

  const passwordHash = changes.password ? await hashPassword(changes.password) : undefined

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } })
      if (!user) throw new ApiError(404, `User ${id} was not found.`, 'USER_NOT_FOUND')

      if (changes.role !== undefined && changes.role !== user.role) {
        await assertRoleChangeAllowed(tx, user, changes.role)
      }

      const deactivating = changes.isActive === false && user.isActive
      return tx.user.update({
        where: { id },
        data: {
          name: changes.name,
          email: changes.email === undefined ? undefined : normalizeEmail(changes.email),
          role: changes.role,
          isActive: changes.isActive,
          passwordHash,
          ...(deactivating || passwordHash ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: authUserSelect,
      })
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A user with this email already exists.', 'EMAIL_TAKEN')
    }
    throw err
  }
}
