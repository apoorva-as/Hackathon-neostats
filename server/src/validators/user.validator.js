import { z } from 'zod'
import { paginationShape, searchField } from './common.validator.js'

export const USER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']

export const listUsersQuerySchema = z.object({
  ...paginationShape,
  role: z.enum(USER_ROLES).optional(),
  search: searchField,
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
})
