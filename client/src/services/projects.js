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
