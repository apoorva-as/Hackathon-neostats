// Entry point: starts the HTTP server.
import app from './app.js'
import { assertAuthConfig, env } from './config/env.js'

// Refuse to start without a real JWT secret (no insecure fallback).
try {
  assertAuthConfig()
} catch (err) {
  console.error(`[config] ${err.message}`)
  process.exit(1)
}

const server = app.listen(env.PORT, () => {
  console.log(`NEOSTATS API running on http://localhost:${env.PORT} (${env.NODE_ENV})`)
  console.log(`Health check: http://localhost:${env.PORT}/api/health`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Stop the other process or change PORT in server/.env.`)
  } else {
    console.error('Server failed to start:', err)
  }
  process.exit(1)
})
