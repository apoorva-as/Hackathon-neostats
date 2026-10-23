import { z } from 'zod'
import { idParamSchema, paginationShape, positiveId, searchField } from './common.validator.js'

export const PROJECT_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']
export const PROJECT_ROLES = ['MEMBER', 'VIEWER']

export const projectIdParamSchema = idParamSchema

export const listProjectsQuerySchema = z.object({
  ...paginationShape,
  status: z.enum(PROJECT_STATUSES).optional(),
  search: searchField,
  managerId: positiveId.optional(),
})

const name = z
  .string()
  .trim()
  .min(1, 'Project name is required.')
  .max(120, 'Project name is too long (max 120 characters).')
const description = z.string().trim().max(2000, 'Description is too long (max 2000 characters).')
// null means "no manager assigned"
const managerId = positiveId.nullable()

// strictObject rejects unknown fields (a typo like "manager_id" becomes a 400).
export const createProjectSchema = z.strictObject({
  name,
  description: description.optional().default(''),
  status: z.enum(PROJECT_STATUSES).optional().default('ACTIVE'),
  managerId: managerId.optional().default(null),
})

export const updateProjectSchema = z
  .strictObject({
    name: name.optional(),
    description: description.optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    managerId: managerId.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' })

export const memberParamsSchema = z.object({ id: positiveId, userId: positiveId })

export const addMemberSchema = z.strictObject({
  userId: positiveId,
  role: z.enum(PROJECT_ROLES).optional().default('MEMBER'),
})

export const updateMemberSchema = z.strictObject({
  role: z.enum(PROJECT_ROLES),
})
