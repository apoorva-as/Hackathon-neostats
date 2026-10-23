// Preloaded by `npm test` (node --import) BEFORE any app code runs.
// Points Prisma at the separate *_test database, so tests cannot read or
// change development data. dotenv never overrides variables already set.
import { randomBytes } from 'node:crypto'
import { getTestDatabaseUrl } from '../../scripts/testDatabase.js'

process.env.DATABASE_URL = getTestDatabaseUrl().url
process.env.NODE_ENV = 'test'
// A fresh random JWT secret for every test run (never the real one from .env).
process.env.JWT_SECRET = randomBytes(48).toString('hex')
// Minimum allowed bcrypt cost keeps the suite fast; production default is 12.
process.env.BCRYPT_ROUNDS = '10'
