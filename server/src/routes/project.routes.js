import { Router } from 'express'
import * as controller from '../controllers/project.controller.js'
import * as taskController from '../controllers/task.controller.js'
import { validate } from '../middleware/validate.js'
import {
  addMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  memberParamsSchema,
  projectIdParamSchema,
  updateMemberSchema,
  updateProjectSchema,
} from '../validators/project.validator.js'
import { createTaskSchema, listProjectTasksQuerySchema } from '../validators/task.validator.js'

// Mounted at /api/projects (behind requireAuth, see routes/index.js).
// Permission checks happen in the services via policies/project.policy.js.
const router = Router()

router.get('/', validate({ query: listProjectsQuerySchema }), controller.listProjects)
router.post('/', validate({ body: createProjectSchema }), controller.createProject)
router.get('/:id', validate({ params: projectIdParamSchema }), controller.getProject)
router.patch('/:id', validate({ params: projectIdParamSchema, body: updateProjectSchema }), controller.updateProject)
router.delete('/:id', validate({ params: projectIdParamSchema }), controller.deleteProject)

router.get('/:id/members', validate({ params: projectIdParamSchema }), controller.listMembers)
router.post('/:id/members', validate({ params: projectIdParamSchema, body: addMemberSchema }), controller.addMember)
router.patch(
  '/:id/members/:userId',
  validate({ params: memberParamsSchema, body: updateMemberSchema }),
  controller.updateMember,
)
router.delete('/:id/members/:userId', validate({ params: memberParamsSchema }), controller.removeMember)

// Phase 2: tasks of one project (single-task routes live in task.routes.js).
router.get(
  '/:id/tasks',
  validate({ params: projectIdParamSchema, query: listProjectTasksQuerySchema }),
  taskController.listProjectTasks,
)
router.post('/:id/tasks', validate({ params: projectIdParamSchema, body: createTaskSchema }), taskController.createTask)

export default router
