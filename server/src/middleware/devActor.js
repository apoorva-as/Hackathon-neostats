import { devUserSwitcherEnabled } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'

// ---------------------------------------------------------------------------
// TEMPORARY DEVELOPMENT MECHANISM. THIS IS NOT AUTHENTICATION.
//
// Phase 1 has no login. To demo the four roles, the frontend sends the id of
// a seeded user in the `X-Dev-User-Id` header. This middleware loads that
// user FROM THE DATABASE and stores it as `req.actor`. The role used for
// permission checks always comes from the database row, never from the client.
//
// Anyone can still pick any user id, so this is not a security boundary.
// It is disabled when NODE_ENV=production. In Phase 3 a `requireAuth`
// middleware will set `req.actor` from a verified JWT instead, and the
// services/policies that read `req.actor` will not need to change.
// ---------------------------------------------------------------------------
export const DEV_USER_HEADER = 'X-Dev-User-Id'

export async function requireDevActor(req, res, next) {
  if (!devUserSwitcherEnabled) {
    throw new ApiError(401, 'Authentication is not available in this build yet.', 'UNAUTHENTICATED')
  }

  const raw = req.get(DEV_USER_HEADER)
  const id = Number(raw)
  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw new ApiError(
      401,
      'No development user selected. Choose a user in the header switcher (X-Dev-User-Id).',
      'UNAUTHENTICATED',
    )
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
  if (!user) {
    throw new ApiError(401, 'The selected development user does not exist.', 'UNAUTHENTICATED')
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This user account is deactivated.', 'USER_INACTIVE')
  }

  req.actor = user
  next()
}
