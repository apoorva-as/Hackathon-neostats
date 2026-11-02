import api from './api.js'

// List endpoints return { items, meta }; the others return the entity itself.

export async function listProjects(params = {}) {
  const { data } = await api.get('/projects', { params })
  return { items: data.data, meta: data.meta }
}

export async function getProject(id) {
  const { data } = await api.get(`/projects/${id}`)
  return data.data
}

export async function createProject(values) {
  const { data } = await api.post('/projects', values)
  return data.data
}

export async function updateProject(id, values) {
  const { data } = await api.patch(`/projects/${id}`, values)
  return data.data
}

export async function deleteProject(id) {
  const { data } = await api.delete(`/projects/${id}`)
  return data.data
}

export async function listMembers(projectId) {
  const { data } = await api.get(`/projects/${projectId}/members`)
  return data.data
}

export async function addMember(projectId, { userId, role }) {
  const { data } = await api.post(`/projects/${projectId}/members`, { userId, role })
  return data.data
}

export async function updateMemberRole(projectId, userId, role) {
  const { data } = await api.patch(`/projects/${projectId}/members/${userId}`, { role })
  return data.data
}

export async function removeMember(projectId, userId) {
  const { data } = await api.delete(`/projects/${projectId}/members/${userId}`)
  return data.data
}

// Every project the user can see (follows `meta.totalPages`, 100 per page).
// The API applies the same role-based visibility as for a single page.
export async function listAllProjects(params = {}) {
  const items = []
  for (let page = 1; page <= 20; page += 1) {
    const result = await listProjects({ ...params, page, limit: 100 })
    items.push(...result.items)
    if (page >= result.meta.totalPages) return { items, total: result.meta.total }
  }
  return { items, total: items.length }
}
