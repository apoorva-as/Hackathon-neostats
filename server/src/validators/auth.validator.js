import { z } from 'zod'
import { emailField } from './user.validator.js'

// Login checks only the shape; the password policy applies when passwords are set.
export const loginSchema = z.strictObject({
  email: emailField,
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(200),
})
