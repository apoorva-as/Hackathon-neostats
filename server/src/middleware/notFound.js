import { ApiError } from '../utils/ApiError.js'

// Runs when no route matched: turns the request into a 404 ApiError.
export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'))
}
