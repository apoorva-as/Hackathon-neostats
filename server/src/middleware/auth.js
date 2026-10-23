import { prisma } from '../config/prisma.js'
import { authUserSelect } from '../services/user.service.js'
import { ApiError } from '../utils/ApiError.js'
import { readAuthCookie, verifyAuthToken } from '../utils/authToken.js'

// Authentication (WHO is calling). Authorization (WHAT they may do) stays in
// src/policies/*.policy.js and the services.
//
// For every protected request:
//   1. read the token from the HttpOnly cookie
//   2. verify signature + expiry (jsonwebtoken)
//   3. load the user from the database (the only source of role/active status)
//   4. reject missing users, deactivated users and invalidated tokens
//      (token version no longer matches: logout, deactivation, password reset)
//   5. set req.actor and continue
// Any failure is 401, and the client never chooses the identity: user ids or
// roles sent in bodies, query strings or headers are ignored here.
const unauthenticated = (message = 'Please sign in to continue.') =>
  new ApiError(401, message, 'UNAUTHENTICATED')

export async function requireAuth(req, res, next) {
  const token = readAuthCookie(req)
  if (!token) throw unauthenticated()

  const claims = verifyAuthToken(token)
  if (!claims) throw unauthenticated('Your session is invalid or has expired. Please sign in again.')

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { ...authUserSelect, tokenVersion: true },
  })
  if (!user || !user.isActive || user.tokenVersion !== claims.tokenVersion) {
    throw unauthenticated('Your session is no longer valid. Please sign in again.')
  }

  const { tokenVersion, ...actor } = user
  req.actor = actor // { id, name, email, role, isActive, createdAt }
  next()
}

// CSRF defence in depth (the SameSite=Strict cookie is the main one):
// browsers always send an Origin header on cross-origin writes, so a write
// from any page other than the configured frontend is refused.
// Requests without Origin (curl, Postman, tests) carry no ambient browser
// cookie, so they are not a CSRF risk.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function checkOrigin(allowedOrigin) {
  return (req, res, next) => {
    const origin = req.get('origin')
    if (SAFE_METHODS.has(req.method) || !origin || origin === allowedOrigin) return next()
    next(new ApiError(403, 'Request origin is not allowed.', 'FORBIDDEN_ORIGIN'))
  }
}
