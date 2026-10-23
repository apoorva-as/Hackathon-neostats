// Works out the connection URL of the separate TEST database.
// Tests NEVER use the development database: they run against
// `<dev database name>_test` (e.g. neostats_project_manager_test) on the same
// local PostgreSQL server, or TEST_DATABASE_URL if you set it in server/.env.
import 'dotenv/config'

export function getTestDatabaseUrl() {
  const explicit = process.env.TEST_DATABASE_URL
  const base = explicit || process.env.DATABASE_URL
  if (!base) {
    throw new Error('DATABASE_URL is not set in server/.env, so the test database URL cannot be derived.')
  }

  const url = new URL(base)
  if (!explicit) {
    const devName = url.pathname.replace(/^\//, '')
    url.pathname = `/${devName}_test`
  }

  const name = url.pathname.replace(/^\//, '')
  // Safety guard: refuse anything that is not clearly a test database.
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(`Refusing to use "${name}" for tests: the name must end with "_test".`)
  }
  return { url: url.toString(), name }
}
