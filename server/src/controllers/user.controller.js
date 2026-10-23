import * as userService from '../services/user.service.js'

export async function listUsers(req, res) {
  const { users, meta } = await userService.listUsers(req.actor, req.valid.query)
  res.json({ success: true, data: users, meta })
}

export async function getUser(req, res) {
  const user = await userService.getUser(req.actor, req.valid.params.id)
  res.json({ success: true, data: user })
}

export async function createUser(req, res) {
  const user = await userService.createUser(req.actor, req.valid.body)
  res.status(201).json({ success: true, data: user })
}

export async function updateUser(req, res) {
  const user = await userService.updateUser(req.actor, req.valid.params.id, req.valid.body)
  res.json({ success: true, data: user })
}
