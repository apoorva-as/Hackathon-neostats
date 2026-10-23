// Error with an HTTP status code. Throw it from controllers or services;
// the central error handler turns it into a JSON response.
export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}
