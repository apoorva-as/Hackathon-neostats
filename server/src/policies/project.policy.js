// Permission rules for projects and memberships, in one place.
// Every function receives the `actor` (the current user loaded from the DB:
// { id, role }) and returns true/false. Services call these and throw 403.
// Phase 3 keeps these rules; only how `actor` is obtained changes.

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  TEAM_MEMBER: 'TEAM_MEMBER',
  VIEWER: 'VIEWER',
})

const isAdmin = (actor) => actor.role === ROLES.ADMIN
const managesProject = (actor, project) =>
  actor.role === ROLES.PROJECT_MANAGER && project.managerId === actor.id

// Prisma `where` filter for the projects an actor may see.
//   Admin, Viewer (read-only): all projects
//   Project Manager: projects they manage
//   Team Member: projects they are a member of
export function visibleProjectsWhere(actor) {
  switch (actor.role) {
    case ROLES.ADMIN:
    case ROLES.VIEWER:
      return {}
    case ROLES.PROJECT_MANAGER:
      return { managerId: actor.id }
    case ROLES.TEAM_MEMBER:
      return { members: { some: { userId: actor.id } } }
    default:
      return { id: -1 } // unknown role sees nothing
  }
}

// `project` must have `managerId` and `memberUserIds` (array of user ids).
export function canViewProject(actor, project) {
  if (isAdmin(actor) || actor.role === ROLES.VIEWER) return true
  if (actor.role === ROLES.PROJECT_MANAGER) return project.managerId === actor.id
  if (actor.role === ROLES.TEAM_MEMBER) return project.memberUserIds.includes(actor.id)
  return false
}

export const canCreateProject = isAdmin
export const canDeleteProject = isAdmin
export const canAssignManager = isAdmin

// Admin edits any project; a PM edits name/description/status of projects they manage.
export function canEditProject(actor, project) {
  return isAdmin(actor) || managesProject(actor, project)
}

// Admin, or the PM of this project, can add/remove members and change their role.
export function canManageMembers(actor, project) {
  return isAdmin(actor) || managesProject(actor, project)
}

// The user directory is needed to pick managers (Admin) and members (Admin, PM).
export function canListUsers(actor) {
  return isAdmin(actor) || actor.role === ROLES.PROJECT_MANAGER
}

// What the UI may offer for one project (UX hints only; the server re-checks).
export function projectPermissions(actor, project) {
  return {
    canEdit: canEditProject(actor, project),
    canDelete: canDeleteProject(actor),
    canAssignManager: canAssignManager(actor),
    canManageMembers: canManageMembers(actor, project),
  }
}
