import { Router } from 'express'
import { devUserSwitcherEnabled } from '../config/env.js'
import { listDevUsers } from '../controllers/user.controller.js'
import { ApiError } from '../utils/ApiError.js'

// TEMPORARY (Phase 1): development-only helpers. NOT authentication.
// Hidden (404) when NODE_ENV=production. Removed in Phase 3.
const router = Router()

router.use((req, res, next) => {
  if (!devUserSwitcherEnabled) {
    return next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'))
  }
  next()
})

router.get('/users', listDevUsers)

export default router
