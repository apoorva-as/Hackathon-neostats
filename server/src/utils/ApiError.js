// Error with an HTTP status code. Throw it from controllers or services;
// the central error handler turns it into a JSON response.
// `details` (optional) carries extra info such as validation issues.
export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = undefined) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}
