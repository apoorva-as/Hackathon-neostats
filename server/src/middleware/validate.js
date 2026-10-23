import { ApiError } from '../utils/ApiError.js'

// Validates req.params / req.query / req.body against Zod schemas.
// Parsed (coerced, trimmed) values replace the raw ones, so controllers
// always receive clean data. Validation errors become a 400 response.
//
// Usage: router.post('/', validate({ body: createProjectSchema }), controller)
export function validate(schemas) {
  return (req, res, next) => {
    const details = []
    const parsed = {}

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part]
      if (!schema) continue
      const result = schema.safeParse(req[part] ?? {})
      if (result.success) {
        parsed[part] = result.data
      } else {
        for (const issue of result.error.issues) {
          details.push({ location: part, path: issue.path.join('.'), message: issue.message })
        }
      }
    }

    if (details.length > 0) {
      return next(new ApiError(400, 'Request validation failed.', 'VALIDATION_ERROR', details))
    }

    // Express 5 makes req.query a getter, so store parsed values on req.valid.
    req.valid = parsed
    next()
  }
}
