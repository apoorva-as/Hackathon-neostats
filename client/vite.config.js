import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly instead of silently switching ports, because the backend's
    // CORS setting (CLIENT_ORIGIN) expects exactly http://localhost:5173.
    strictPort: true,
  },
})
