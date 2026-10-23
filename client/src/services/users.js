import api from './api.js'

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params: { limit: 100, ...params } })
  return { items: data.data, meta: data.meta }
}

// Admin only (the server enforces it).
export async function createUser(values) {
  const { data } = await api.post('/users', values)
  return data.data
}

// Admin only. { isActive: false } deactivates; { password } resets it.
export async function updateUser(id, values) {
  const { data } = await api.patch(`/users/${id}`, values)
  return data.data
}
