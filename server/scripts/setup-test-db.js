// Prepares the test database before `npm test` (runs as the npm "pretest" hook):
//   1. creates `<dev db>_test` if it does not exist (never drops anything)
//   2. applies the committed migrations to it with `prisma migrate deploy`
// It does not touch the development database's data.
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { getTestDatabaseUrl } from './testDatabase.js'

const { url, name } = getTestDatabaseUrl()

// Connect to the PostgreSQL server through the dev database only to check
// whether the test database exists. (A one-off client is fine in a script.)
const admin = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
try {
  const rows = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${name}`
  if (rows.length === 0) {
    // Identifiers cannot be bound as parameters; `name` is validated by
    // getTestDatabaseUrl() to match /^[a-z0-9_]+_test$/.
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`)
    console.log(`[test-db] Created database ${name}`)
  }
} catch (err) {
  console.error(`[test-db] Could not prepare ${name}:`, err.errorCode ?? err.message)
  process.exit(1)
} finally {
  await admin.$disconnect()
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: url },
  stdio: ['ignore', 'pipe', 'inherit'],
  shell: process.platform === 'win32',
})
if (result.status !== 0) {
  console.error('[test-db] prisma migrate deploy failed for the test database')
  process.exit(result.status ?? 1)
}
console.log(`[test-db] ${name} is migrated and ready`)
