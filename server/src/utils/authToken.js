// Login tokens (JWT, HS256) and the cookie that carries them.
//
// The token holds only the user id (`sub`) and the user's `tokenVersion`
// (`ver`). Role and active status are NOT in the token: they are re-read from
// the database on every request, so changes apply immediately.
import jwt from 'jsonwebtoken'
import { assertAuthConfig, env, isProduction } from '../config/env.js'

export const AUTH_COOKIE = 'neostats_session'
const ALGORITHM = 'HS256'

export function signAuthToken(user) {
  assertAuthConfig() // never sign with a missing/weak secret
  return jwt.sign({ sub: String(user.id), ver: user.tokenVersion }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

// Returns { userId, tokenVersion } or null if the token is invalid/expired.
export function verifyAuthToken(token) {
  assertAuthConfig()
  try {
    // `algorithms` is pinned so a token cannot pick its own algorithm (e.g. "none").
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] })
    const userId = Number(payload.sub)
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(payload.ver)) return null
    return { userId, tokenVersion: payload.ver }
  } catch {
    return null
  }
}

// Cookie flags: HttpOnly (JavaScript cannot read it, so XSS cannot steal it),
// SameSite=Strict (never sent on cross-site requests: CSRF protection),
// Secure in production (HTTPS only). The same options are used to clear it.
function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' }
}

export function setAuthCookie(res, token) {
  // Cookie lifetime = token lifetime (taken from the token's own `exp`).
  const { exp } = jwt.decode(token)
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: exp * 1000 - Date.now() })
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions())
}

// Reads one cookie from the Cookie header (no extra dependency needed).
export function readAuthCookie(req) {
  const header = req.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === AUTH_COOKIE) {
      const value = part.slice(index + 1).trim()
      return value || null
    }
  }
  return null
}
