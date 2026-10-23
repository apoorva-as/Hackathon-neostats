// Client-side form checks matching the server's Zod rules (instant feedback
// only; the server validates everything again).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginForm({ email = '', password = '' }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

// Same policy as the server: 8+ characters, a letter and a digit, <= 72 bytes.
export function passwordProblem(password = '') {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (new TextEncoder().encode(password).length > 72) return 'Password must be at most 72 bytes.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain a letter and a digit.'
  return null
}

// `isNew`: creating a user (password required). When editing, an empty
// password means "keep the current password".
export function validateUserForm(values, { isNew }) {
  const errors = {}
  const name = (values.name ?? '').trim()
  if (!name) errors.name = 'Name is required.'
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters.'

  const email = (values.email ?? '').trim()
  if (!email) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email) || email.length > 255) errors.email = 'Enter a valid email address.'

  if (!values.role) errors.role = 'Choose a role.'

  if (isNew || values.password) {
    const problem = passwordProblem(values.password ?? '')
    if (problem) errors.password = problem
  }
  return errors
}

// Payload for POST /users (isNew) or PATCH /users/:id (only changed fields).
export function toUserPayload(values, original = null) {
  const next = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
  }
  if (!original) return { ...next, password: values.password }

  const payload = {}
  for (const key of Object.keys(next)) {
    if (next[key] !== original[key]) payload[key] = next[key]
  }
  if (values.password) payload.password = values.password
  return payload
}
