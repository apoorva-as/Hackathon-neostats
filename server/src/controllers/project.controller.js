import * as memberService from '../services/member.service.js'
import * as projectService from '../services/project.service.js'

// Controllers only read the validated request (req.valid), call a service and
// send the response. req.actor is set by the requireDevActor middleware.

export async function listProjects(req, res) {
  const { projects, meta } = await projectService.listProjects(req.actor, req.valid.query)
  res.json({ success: true, data: projects, meta })
}

export async function getProject(req, res) {
  const project = await projectService.getProject(req.actor, req.valid.params.id)
  res.json({ success: true, data: project })
}

export async function createProject(req, res) {
  const project = await projectService.createProject(req.actor, req.valid.body)
  res.status(201).json({ success: true, data: project })
}

export async function updateProject(req, res) {
  const project = await projectService.updateProject(req.actor, req.valid.params.id, req.valid.body)
  res.json({ success: true, data: project })
}

export async function deleteProject(req, res) {
  const result = await projectService.deleteProject(req.actor, req.valid.params.id)
  res.json({ success: true, data: result })
}

export async function listMembers(req, res) {
  const members = await memberService.listMembers(req.actor, req.valid.params.id)
  res.json({ success: true, data: members })
}

export async function addMember(req, res) {
  const member = await memberService.addMember(req.actor, req.valid.params.id, req.valid.body)
  res.status(201).json({ success: true, data: member })
}

export async function updateMember(req, res) {
  const { id, userId } = req.valid.params
  const member = await memberService.updateMemberRole(req.actor, id, userId, req.valid.body)
  res.json({ success: true, data: member })
}

export async function removeMember(req, res) {
  const { id, userId } = req.valid.params
  const result = await memberService.removeMember(req.actor, id, userId)
  res.json({ success: true, data: result })
}
