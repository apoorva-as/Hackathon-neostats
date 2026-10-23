import { z } from 'zod'

export const positiveId = z.coerce.number().int().positive()

export const idParamSchema = z.object({ id: positiveId })

export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

// Optional free-text search from a query string ("" is treated as absent).
export const searchField = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => (value ? value : undefined))
