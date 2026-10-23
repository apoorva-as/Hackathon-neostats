import * as userService from '../services/user.service.js'

export async function listUsers(req, res) {
  const { users, meta } = await userService.listUsers(req.actor, req.valid.query)
  res.json({ success: true, data: users, meta })
}

// TEMPORARY (Phase 1): feeds the development user switcher. Not authentication.
export async function listDevUsers(req, res) {
  const users = await userService.listDevUsers()
  res.json({ success: true, data: users })
}
