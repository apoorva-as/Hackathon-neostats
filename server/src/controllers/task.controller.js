import * as commentService from '../services/comment.service.js'
import * as taskService from '../services/task.service.js'

// Controllers only read the validated request (req.valid), call a service and
// send the response. req.actor is set by the requireAuth middleware.

export async function listProjectTasks(req, res) {
  const { tasks, meta } = await taskService.listProjectTasks(req.actor, req.valid.params.id, req.valid.query)
  res.json({ success: true, data: tasks, meta })
}

export async function createTask(req, res) {
  const task = await taskService.createTask(req.actor, req.valid.params.id, req.valid.body)
  res.status(201).json({ success: true, data: task })
}

export async function listTasks(req, res) {
  const { tasks, meta } = await taskService.listTasks(req.actor, req.valid.query)
  res.json({ success: true, data: tasks, meta })
}

export async function getTask(req, res) {
  const task = await taskService.getTask(req.actor, req.valid.params.taskId)
  res.json({ success: true, data: task })
}

export async function updateTask(req, res) {
  const task = await taskService.updateTask(req.actor, req.valid.params.taskId, req.valid.body)
  res.json({ success: true, data: task })
}

export async function deleteTask(req, res) {
  const result = await taskService.deleteTask(req.actor, req.valid.params.taskId)
  res.json({ success: true, data: result })
}

export async function listComments(req, res) {
  const { comments, meta } = await commentService.listComments(req.actor, req.valid.params.taskId, req.valid.query)
  res.json({ success: true, data: comments, meta })
}

export async function createComment(req, res) {
  const comment = await commentService.createComment(req.actor, req.valid.params.taskId, req.valid.body)
  res.status(201).json({ success: true, data: comment })
}

export async function deleteComment(req, res) {
  const { taskId, commentId } = req.valid.params
  const result = await commentService.deleteComment(req.actor, taskId, commentId)
  res.json({ success: true, data: result })
}
