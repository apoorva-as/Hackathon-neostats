import { z } from 'zod'
import { paginationShape, positiveId, searchField } from './common.validator.js'

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
export const COMMENT_MAX = 2000

export const taskIdParamSchema = z.object({ taskId: positiveId })
export const commentParamsSchema = z.object({ taskId: positiveId, commentId: positiveId })

const filters = {
  ...paginationShape,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: positiveId.optional(),
  search: searchField,
}

// GET /api/projects/:id/tasks
export const listProjectTasksQuerySchema = z.object(filters)

// GET /api/tasks (tasks across every project the user can see)
export const listTasksQuerySchema = z.object({ ...filters, projectId: positiveId.optional() })

const title = z
  .string()
  .trim()
  .min(1, 'Task title is required.')
  .max(200, 'Task title is too long (max 200 characters).')
const description = z.string().trim().max(5000, 'Description is too long (max 5000 characters).')
// Calendar date "YYYY-MM-DD"; null clears it.
const dueDate = z.iso.date({ message: 'Due date must be a date in YYYY-MM-DD format.' }).nullable()
// null means "unassigned"
const assigneeId = positiveId.nullable()

export const createTaskSchema = z.strictObject({
  title,
  description: description.optional().default(''),
  status: z.enum(TASK_STATUSES).optional().default('TODO'),
  priority: z.enum(TASK_PRIORITIES).optional().default('MEDIUM'),
  dueDate: dueDate.optional().default(null),
  assigneeId: assigneeId.optional().default(null),
})

// `version` is the task version the client last read (optimistic concurrency).
export const updateTaskSchema = z
  .strictObject({
    version: z.number({ message: 'version is required: send the task version you last loaded.' }).int().positive(),
    title: title.optional(),
    description: description.optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: dueDate.optional(),
    assigneeId: assigneeId.optional(),
  })
  .refine((data) => Object.keys(data).some((key) => key !== 'version'), {
    message: 'Provide at least one field to update.',
  })

export const listCommentsQuerySchema = z.object({
  page: paginationShape.page,
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const createCommentSchema = z.strictObject({
  body: z
    .string({ message: 'Comment text is required.' })
    .trim()
    .min(1, 'Comment cannot be empty.')
    .max(COMMENT_MAX, `Comment is too long (max ${COMMENT_MAX} characters).`),
})
