import api from './api.js'

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params: { limit: 100, ...params } })
  return { items: data.data, meta: data.meta }
}

// TEMPORARY (Phase 1): users for the development user switcher.
export async function listDevUsers() {
  const { data } = await api.get('/dev/users')
  return data.data
}
