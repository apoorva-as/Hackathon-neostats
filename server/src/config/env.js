// The ONLY place that reads process.env. Other modules import `env` from here.
import 'dotenv/config'

function toPort(value, fallback) {
  const port = Number.parseInt(value ?? '', 10)
  return Number.isInteger(port) && port > 0 ? port : fallback
}

// bcrypt work factor: 12 by default, never below 10 (each +1 doubles the cost).
function toBcryptRounds(value) {
  const rounds = Number.parseInt(value ?? '', 10)
  if (!Number.isInteger(rounds)) return 12
  return Math.min(Math.max(rounds, 10), 15)
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toPort(process.env.PORT, 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  // Secrets: never log these values.
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  BCRYPT_ROUNDS: toBcryptRounds(process.env.BCRYPT_ROUNDS),
  // Development-only password given to seeded demo accounts (see prisma/seed.js).
  SEED_DEMO_PASSWORD: process.env.SEED_DEMO_PASSWORD ?? '',
})

export const isProduction = env.NODE_ENV === 'production'

// DEVELOPMENT ONLY: the login page may list active demo accounts
// (GET /api/auth/demo-accounts). Listing accounts to anonymous visitors
// reveals who has an account, so it is always off in production.
export const demoAccountsEnabled = !isProduction

const PLACEHOLDER_SECRET = 'replace-with-a-long-random-string'

// Throws if the JWT secret is missing or obviously weak. There is deliberately
// NO fallback secret: without a real one the server refuses to start.
// The message never includes the secret itself.
export function assertAuthConfig() {
  const secret = env.JWT_SECRET
  if (!secret || secret === PLACEHOLDER_SECRET || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short (min 32 characters). Set a long random value in server/.env, e.g. ' +
        "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
    )
  }
}
