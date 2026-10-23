import axios from 'axios'

// Base URL comes from client/.env (VITE_API_BASE_URL).
// Example: http://localhost:4000/api
//
// Authentication: the server sets an HttpOnly session cookie at login.
// `withCredentials: true` makes the browser send it with every API call.
// JavaScript never sees or stores the token (no localStorage, no headers).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
})

// The AuthProvider registers a callback here. When any request (other than
// the login form itself) answers 401, the session is gone (expired, logged
// out elsewhere, or the account was deactivated), so the app returns to /login.
let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url ?? ''
    if (error?.response?.status === 401 && !url.startsWith('/auth/') && onUnauthorized) {
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)

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

// 409 VERSION_CONFLICT: the task changed since it was loaded. The API also
// sends the latest copy (error.currentTask) so the UI can offer a reload.
export function isVersionConflict(error) {
  return error?.response?.status === 409 && getErrorCode(error) === 'VERSION_CONFLICT'
}

export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}

export default api
