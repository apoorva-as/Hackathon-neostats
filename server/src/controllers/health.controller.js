import { prisma } from '../config/prisma.js'

// GET /api/health: reports only that the API process is running.
// It does NOT check PostgreSQL (see getDatabaseHealth for that).
export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'neostats-api',
      database: 'not_checked',
      timestamp: new Date().toISOString(),
    },
  })
}

// GET /api/health/db: runs a real `SELECT 1` against PostgreSQL.
export async function getDatabaseHealth(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      success: true,
      data: { database: 'connected', timestamp: new Date().toISOString() },
    })
  } catch (err) {
    // Log only the Prisma error code/name, never the connection string.
    console.error('[health/db] Database check failed:', err.errorCode ?? err.name)
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNREACHABLE',
        message: 'Could not connect to the database. Check DATABASE_URL in server/.env.',
      },
    })
  }
}
