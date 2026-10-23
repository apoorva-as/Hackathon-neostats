import axios from 'axios'

// Base URL comes from client/.env (VITE_API_BASE_URL).
// Example: http://localhost:4000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export async function getHealth() {
  const response = await api.get('/health')
  return response.data
}

export default api
