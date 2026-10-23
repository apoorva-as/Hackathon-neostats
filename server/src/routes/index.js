// Mounts every feature router under /api. Add new feature routers here.
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import authRoutes from './auth.routes.js'
import healthRoutes from './health.routes.js'
import projectRoutes from './project.routes.js'
import taskRoutes from './task.routes.js'
import userRoutes from './user.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)

// Everything below needs a signed-in user: requireAuth verifies the session
// cookie and loads the user from the database into req.actor.
router.use('/users', requireAuth, userRoutes)
router.use('/projects', requireAuth, projectRoutes)
router.use('/tasks', requireAuth, taskRoutes)

export default router
