import { Router } from 'express'
import * as controller from '../controllers/user.controller.js'
import { validate } from '../middleware/validate.js'
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '../validators/user.validator.js'

// Mounted at /api/users (behind requireAuth). Permission checks happen in
// user.service.js: listing = Admin + PM, everything else = Admin only.
// There is no DELETE: users are deactivated (PATCH { isActive: false }).
const router = Router()

router.get('/', validate({ query: listUsersQuerySchema }), controller.listUsers)
router.post('/', validate({ body: createUserSchema }), controller.createUser)
router.get('/:id', validate({ params: userIdParamSchema }), controller.getUser)
router.patch('/:id', validate({ params: userIdParamSchema, body: updateUserSchema }), controller.updateUser)

export default router
