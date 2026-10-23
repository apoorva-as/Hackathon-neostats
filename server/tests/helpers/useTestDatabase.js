// Preloaded by `npm test` (node --import) BEFORE any app code runs.
// Points Prisma at the separate *_test database, so tests cannot read or
// change development data. dotenv never overrides variables already set.
import { getTestDatabaseUrl } from '../../scripts/testDatabase.js'

process.env.DATABASE_URL = getTestDatabaseUrl().url
process.env.NODE_ENV = 'test'
