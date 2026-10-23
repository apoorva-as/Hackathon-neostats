import { Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError.js'

// Maps known Prisma errors to safe API errors (no SQL or internals leaked).
function fromPrismaError(err) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null
  switch (err.code) {
    case 'P2002': // unique constraint
      return { statusCode: 409, code: 'CONFLICT', message: 'A record with these values already exists.' }
    case 'P2025': // record to update/delete not found
      return { statusCode: 404, code: 'NOT_FOUND', message: 'The requested record was not found.' }
    case 'P2003': // foreign key constraint
      return { statusCode: 400, code: 'INVALID_REFERENCE', message: 'A referenced record does not exist.' }
    default:
      return null
  }
}

// Central error handler. Express 5 forwards errors thrown in async handlers
// here automatically. It must keep 4 parameters so Express treats it as an
// error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body rejected by express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' },
    })
  }

  const prismaError = fromPrismaError(err)
  if (prismaError) {
    return res.status(prismaError.statusCode).json({
      success: false,
      error: { code: prismaError.code, message: prismaError.message },
    })
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500
  const isServerError = statusCode >= 500

  if (isServerError) {
    // Full details stay in the server log; the client never sees stack traces.
    console.error('[error]', err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err instanceof ApiError ? err.code : isServerError ? 'INTERNAL_SERVER_ERROR' : 'ERROR',
      // Unexpected errors get a generic message so internals are not leaked.
      message: isServerError && !err.statusCode ? 'Internal server error' : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  })
}
