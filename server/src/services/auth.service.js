import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/ApiError.js'
import { signAuthToken, verifyAuthToken } from '../utils/authToken.js'
import { verifyPassword } from '../utils/password.js'
import { authUserSelect, normalizeEmail } from './user.service.js'

// Same answer for "no such email", "wrong password" and "no password set",
// so the login form does not reveal which accounts exist.
const invalidCredentials = () => new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS')

// Returns { user, token } for valid credentials of an active account.
export async function login({ email, password }) {
  const record = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { ...authUserSelect, passwordHash: true, tokenVersion: true },
  })

  // verifyPassword runs bcrypt even when the user does not exist (timing).
  const valid = await verifyPassword(password, record?.passwordHash ?? null)
  if (!record || !valid) throw invalidCredentials()

  // Only revealed to someone who already knows the correct password.
  if (!record.isActive) {
    throw new ApiError(403, 'This account has been deactivated. Contact an administrator.', 'ACCOUNT_DEACTIVATED')
  }

  const { passwordHash, tokenVersion, ...user } = record
  return { user, token: signAuthToken({ id: user.id, tokenVersion }) }
}

// DEVELOPMENT ONLY (see routes/auth.routes.js): accounts the login page may
// offer in its account picker. Only active users who can actually log in
// (a password is set). Only public fields: never passwordHash/tokenVersion.
// Choosing an account only fills the email; the password is still verified
// by login(), and the role used for permissions is always read from the DB.
export function listDemoAccounts() {
  return prisma.user.findMany({
    where: { isActive: true, passwordHash: { not: null } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 200,
  })
}

// Logout invalidates EVERY token issued so far for this user (all browsers /
// devices), because tokens are only valid while their version matches.
// The update only matches while the token's version is still current, so an
// already-invalid or forged token changes nothing.
export async function logout(token) {
  const claims = token ? verifyAuthToken(token) : null
  if (!claims) return
  await prisma.user.updateMany({
    where: { id: claims.userId, tokenVersion: claims.tokenVersion },
    data: { tokenVersion: { increment: 1 } },
  })
}
