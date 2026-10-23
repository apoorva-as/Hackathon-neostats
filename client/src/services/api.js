import axios from 'axios'

// Base URL comes from client/.env (VITE_API_BASE_URL).
// Example: http://localhost:4000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ---------------------------------------------------------------------------
// TEMPORARY (Phase 1): development user switcher. NOT authentication.
// The id of the user picked in the header is sent as X-Dev-User-Id. The
// server looks the user up in the database and uses THAT role for every
// permission check. Phase 3 replaces this with an Authorization: Bearer token.
// ---------------------------------------------------------------------------
let devUserId = null

export function setDevUserId(id) {
  devUserId = id
}

api.interceptors.request.use((config) => {
  if (devUserId) config.headers['X-Dev-User-Id'] = String(devUserId)
  return config
})

// Turns any Axios error into a message that is safe to show in the UI.
export function getErrorMessage(error) {
  if (error?.response?.data?.error?.message) return error.response.data.error.message
  if (error?.request && !error?.response) {
    return 'Cannot reach the API server. Make sure the backend is running (npm run dev).'
  }
  return error?.message || 'Something went wrong.'
}

// Validation errors from the API as { fieldName: message }.
export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details ?? []
  return Object.fromEntries(details.filter((d) => d.path).map((d) => [d.path, d.message]))
}

export function getErrorCode(error) {
  return error?.response?.data?.error?.code ?? null
}

export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}

export default api
