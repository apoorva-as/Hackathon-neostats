// Mounts every feature router under /api. Add new feature routers here.
import { Router } from 'express'
import { requireDevActor } from '../middleware/devActor.js'
import devRoutes from './dev.routes.js'
import healthRoutes from './health.routes.js'
import projectRoutes from './project.routes.js'
import userRoutes from './user.routes.js'

const router = Router()

router.use('/health', healthRoutes)

// TEMPORARY (Phase 1): development user switcher support. Not authentication.
router.use('/dev', devRoutes)

// Feature routes need a current user (req.actor). In Phase 3, requireDevActor
// is replaced by a JWT-based requireAuth middleware.
router.use('/users', requireDevActor, userRoutes)
router.use('/projects', requireDevActor, projectRoutes)

export default router
