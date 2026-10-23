import { isProduction } from '../config/env.js'

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

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500
  const isServerError = statusCode >= 500

  if (isServerError) {
    console.error('[error]', err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      // Unexpected errors get a generic message so internals are not leaked.
      message: isServerError && !err.statusCode ? 'Internal server error' : err.message,
      ...(!isProduction && isServerError ? { stack: err.stack } : {}),
    },
  })
}
