import { Router } from 'express'
import * as controller from '../controllers/task.controller.js'
import { validate } from '../middleware/validate.js'
import {
  commentParamsSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from '../validators/task.validator.js'

// Mounted at /api/tasks (behind requireDevActor, see routes/index.js).
// Creating tasks lives under /api/projects/:id/tasks (project.routes.js).
// Permission checks happen in the services via policies/task.policy.js.
const router = Router()

router.get('/', validate({ query: listTasksQuerySchema }), controller.listTasks)
router.get('/:taskId', validate({ params: taskIdParamSchema }), controller.getTask)
router.patch('/:taskId', validate({ params: taskIdParamSchema, body: updateTaskSchema }), controller.updateTask)
router.delete('/:taskId', validate({ params: taskIdParamSchema }), controller.deleteTask)

router.get(
  '/:taskId/comments',
  validate({ params: taskIdParamSchema, query: listCommentsQuerySchema }),
  controller.listComments,
)
router.post(
  '/:taskId/comments',
  validate({ params: taskIdParamSchema, body: createCommentSchema }),
  controller.createComment,
)
router.delete('/:taskId/comments/:commentId', validate({ params: commentParamsSchema }), controller.deleteComment)

export default router
