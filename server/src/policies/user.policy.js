// Permission rules for user accounts (pure functions, like the other policies).
// Listing users for pickers (Admin + PM) lives in project.policy.js#canListUsers.
import { ROLES } from './project.policy.js'

// Only an Admin creates, edits, deactivates and resets passwords of users.
export const canManageUsers = (actor) => actor.role === ROLES.ADMIN

// An Admin cannot change their own role or deactivate their own account.
// This guarantees the acting Admin stays an active Admin (no lock-out).
export function selfChangeViolation(actor, targetId, changes) {
  if (actor.id !== targetId) return null
  if (changes.role !== undefined && changes.role !== actor.role) return 'You cannot change your own role.'
  if (changes.isActive === false) return 'You cannot deactivate your own account.'
  return null
}
