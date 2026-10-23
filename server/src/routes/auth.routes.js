import { Router } from 'express'
import { demoAccountsEnabled } from '../config/env.js'
import * as controller from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ApiError } from '../utils/ApiError.js'
import { loginSchema } from '../validators/auth.validator.js'

// Answers 404 (as if the route did not exist) unless `enabled` is true.
// Exported so tests can check the production behaviour.
export function devOnly(enabled) {
  return (req, res, next) => {
    if (enabled) return next()
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'))
  }
}

// Mounted at /api/auth. Login and logout are public (logout only acts on a
// valid session cookie); /me needs a valid session.
const router = Router()

router.post('/login', validate({ body: loginSchema }), controller.login)
router.get('/me', requireAuth, controller.me)
router.post('/logout', controller.logout)
// Account picker on the login page: development only (404 in production).
router.get('/demo-accounts', devOnly(demoAccountsEnabled), controller.demoAccounts)

export default router
