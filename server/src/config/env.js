// The ONLY place that reads process.env. Other modules import `env` from here.
import 'dotenv/config'

function toPort(value, fallback) {
  const port = Number.parseInt(value ?? '', 10)
  return Number.isInteger(port) && port > 0 ? port : fallback
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toPort(process.env.PORT, 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  // Secrets: never log these values.
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1d',
})

export const isProduction = env.NODE_ENV === 'production'
