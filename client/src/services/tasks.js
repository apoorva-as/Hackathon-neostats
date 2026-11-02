import api from './api.js'

// List endpoints return { items, meta }; the others return the entity itself.

export async function listProjectTasks(projectId, params = {}) {
  const { data } = await api.get(`/projects/${projectId}/tasks`, { params })
  return { items: data.data, meta: data.meta }
}

// Tasks across every project the current user can see (e.g. { assigneeId }).
export async function listTasks(params = {}) {
  const { data } = await api.get('/tasks', { params })
  return { items: data.data, meta: data.meta }
}

export async function createTask(projectId, values) {
  const { data } = await api.post(`/projects/${projectId}/tasks`, values)
  return data.data
}

export async function getTask(id) {
  const { data } = await api.get(`/tasks/${id}`)
  return data.data
}

// `changes` must include the `version` the task had when it was loaded.
// A stale version makes the API answer 409 VERSION_CONFLICT.
export async function updateTask(id, changes) {
  const { data } = await api.patch(`/tasks/${id}`, changes)
  return data.data
}

export async function deleteTask(id) {
  const { data } = await api.delete(`/tasks/${id}`)
  return data.data
}

export async function listComments(taskId, params = {}) {
  const { data } = await api.get(`/tasks/${taskId}/comments`, { params: { limit: 100, ...params } })
  return { items: data.data, meta: data.meta }
}

export async function addComment(taskId, body) {
  const { data } = await api.post(`/tasks/${taskId}/comments`, { body })
  return data.data
}

export async function deleteComment(taskId, commentId) {
  const { data } = await api.delete(`/tasks/${taskId}/comments/${commentId}`)
  return data.data
}

// Every task the user can see, optionally filtered (e.g. { assigneeId }).
// Follows `meta.totalPages` (100 per page); the API applies visibility.
export async function listAllTasks(params = {}) {
  const items = []
  for (let page = 1; page <= 20; page += 1) {
    const result = await listTasks({ ...params, page, limit: 100 })
    items.push(...result.items)
    if (page >= result.meta.totalPages) return { items, total: result.meta.total }
  }
  return { items, total: items.length }
}

// Every task of one project (for the board view).
export async function listAllProjectTasks(projectId, params = {}) {
  const items = []
  for (let page = 1; page <= 20; page += 1) {
    const result = await listProjectTasks(projectId, { ...params, page, limit: 100 })
    items.push(...result.items)
    if (page >= result.meta.totalPages) return { items, total: result.meta.total }
  }
  return { items, total: items.length }
}
