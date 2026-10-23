// Client-side checks for the project form, matching the server's Zod rules.
// They give instant feedback; the server still validates everything.

export const NAME_MAX = 120
export const DESCRIPTION_MAX = 2000

export function validateProjectForm(values) {
  const errors = {}
  const name = (values.name ?? '').trim()
  if (!name) errors.name = 'Project name is required.'
  else if (name.length > NAME_MAX) errors.name = `Project name is too long (max ${NAME_MAX} characters).`
  if ((values.description ?? '').trim().length > DESCRIPTION_MAX) {
    errors.description = `Description is too long (max ${DESCRIPTION_MAX} characters).`
  }
  return errors
}

// Converts form state into the API payload. managerId '' means "no manager".
// `includeManager` is false when the current user may not assign managers.
export function toProjectPayload(values, { includeManager = true } = {}) {
  const payload = {
    name: values.name.trim(),
    description: (values.description ?? '').trim(),
    status: values.status,
  }
  if (includeManager) payload.managerId = values.managerId ? Number(values.managerId) : null
  return payload
}
