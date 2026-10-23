import { Router } from 'express'
import { listUsers } from '../controllers/user.controller.js'
import { validate } from '../middleware/validate.js'
import { listUsersQuerySchema } from '../validators/user.validator.js'

// Mounted at /api/users (behind requireDevActor). Admin and PM only.
const router = Router()

router.get('/', validate({ query: listUsersQuerySchema }), listUsers)

export default router
