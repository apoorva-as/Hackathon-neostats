// Error with an HTTP status code. Throw it from controllers or services;
// the central error handler turns it into a JSON response.
// `details` (optional) carries extra info such as validation issues.
// `extra` (optional) is merged into the error body, e.g. the latest task
// state for a 409 VERSION_CONFLICT: { currentVersion, currentTask }.
export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = undefined, extra = undefined) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.extra = extra
  }
}
