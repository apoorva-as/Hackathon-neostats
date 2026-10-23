import { prisma } from '../config/prisma.js'
import { canListUsers } from '../policies/project.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { pageMeta, paginate } from '../utils/pagination.js'

// The only user fields the API ever returns (no secrets, ever).
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
}

// Emails are stored trimmed and lowercase so "Ana@X.com " and "ana@x.com" match.
export function normalizeEmail(email) {
  return email.trim().toLowerCase()
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

// TEMPORARY (Phase 1): users offered by the development user switcher.
export async function listDevUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}
