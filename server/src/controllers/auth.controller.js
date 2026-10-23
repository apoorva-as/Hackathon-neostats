import * as authService from '../services/auth.service.js'
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../utils/authToken.js'

// POST /api/auth/login: sets the HttpOnly session cookie. The token is never
// put in the response body, so frontend JavaScript never handles it.
export async function login(req, res) {
  const { user, token } = await authService.login(req.valid.body)
  setAuthCookie(res, token)
  res.json({ success: true, data: user })
}

// GET /api/auth/demo-accounts (development only, public)
export async function demoAccounts(req, res) {
  const accounts = await authService.listDemoAccounts()
  res.json({ success: true, data: accounts })
}

// GET /api/auth/me (behind requireAuth): req.actor was loaded from the DB.
export function me(req, res) {
  res.json({ success: true, data: req.actor })
}

// POST /api/auth/logout: invalidates the session (if it is still valid) and
// always clears the cookie, so the browser never keeps a stale one.
export async function logout(req, res) {
  await authService.logout(readAuthCookie(req))
  clearAuthCookie(res)
  res.json({ success: true, data: { loggedOut: true } })
}
