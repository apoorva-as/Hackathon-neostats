import { z } from 'zod'
import { MAX_PASSWORD_BYTES } from '../utils/password.js'
import { idParamSchema, paginationShape, searchField } from './common.validator.js'

export const USER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']

// Trimmed + lowercased so "Ana@X.com " and "ana@x.com" are the same account.
export const emailField = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(255, 'Email must be at most 255 characters.')
  .pipe(z.email({ error: 'Enter a valid email address.' }))

// Password policy for new/reset passwords: 8+ characters with a letter and a
// digit, at most 72 bytes (bcrypt ignores anything after 72 bytes).
export const newPasswordField = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES, 'Password must be at most 72 bytes.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a digit.')

const nameField = z
  .string({ error: 'Name is required.' })
  .trim()
  .min(1, 'Name is required.')
  .max(100, 'Name must be at most 100 characters.')

export const userIdParamSchema = idParamSchema

export const listUsersQuerySchema = z.object({
  ...paginationShape,
  role: z.enum(USER_ROLES).optional(),
  search: searchField,
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
})

export const createUserSchema = z.strictObject({
  name: nameField,
  email: emailField,
  password: newPasswordField,
  role: z.enum(USER_ROLES),
})

// Admin edits. `isActive: false` = deactivate (users are never hard-deleted).
// `password` = admin password reset.
export const updateUserSchema = z
  .strictObject({
    name: nameField.optional(),
    email: emailField.optional(),
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: newPasswordField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to update.')
