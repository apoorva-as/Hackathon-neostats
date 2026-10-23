import api from './api.js'

// The session lives in an HttpOnly cookie set by the server; these calls
// only ever receive the safe user profile, never a token.

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data.data
}

// DEVELOPMENT ONLY: active accounts for the login page's account picker
// ({ id, name, email, role }). Resolves to null when the server does not
// offer the list (404 in production), so the page falls back to typing an email.
export async function listDemoAccounts() {
  try {
    const { data } = await api.get('/auth/demo-accounts')
    return data.data
  } catch (err) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data.data
}

export async function logout() {
  await api.post('/auth/logout')
}
