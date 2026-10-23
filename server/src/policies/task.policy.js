// Permission rules for tasks and comments, in one place (pure functions).
//
// `project` must have `managerId`, `status`, `memberUserIds` and
// `members: [{ userId, role }]` (role = project-level MEMBER | VIEWER).
// `task` must have `assigneeId`; `comment` must have `authorId`.
//
// Summary:
//   Read tasks/comments  anyone who can view the project (canViewProject)
//   Create/delete/assign the project's manager only
//   Edit a task          the manager (all fields); the assignee (status, description)
//   Comment              the manager, and Team Members with project role MEMBER
//   Delete a comment     its author, the project's manager, or an Admin (moderation)
// Archived projects are read-only for all of the above (services return 409).
import { canViewProject, ROLES } from './project.policy.js'

// Fields each kind of editor may send in PATCH /api/tasks/:id (besides `version`).
export const MANAGER_TASK_FIELDS = Object.freeze(['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId'])
export const ASSIGNEE_TASK_FIELDS = Object.freeze(['status', 'description'])

const isManagerOf = (actor, project) => actor.role === ROLES.PROJECT_MANAGER && project.managerId === actor.id

// A Team Member who works on the project (project role MEMBER, not read-only VIEWER).
const isWorkingMember = (actor, project) =>
  actor.role === ROLES.TEAM_MEMBER && project.members.some((m) => m.userId === actor.id && m.role === 'MEMBER')

export const canViewTasks = canViewProject

export const canManageTasks = isManagerOf

// Which task fields this actor may change ([] = none).
export function taskEditableFields(actor, project, task) {
  if (isManagerOf(actor, project)) return MANAGER_TASK_FIELDS
  if (isWorkingMember(actor, project) && task.assigneeId === actor.id) return ASSIGNEE_TASK_FIELDS
  return []
}

export function canComment(actor, project) {
  return isManagerOf(actor, project) || isWorkingMember(actor, project)
}

export function canDeleteComment(actor, project, comment) {
  return actor.role === ROLES.ADMIN || isManagerOf(actor, project) || comment.authorId === actor.id
}

// What the UI may offer for one task (UX hints only; the server re-checks).
export function taskPermissions(actor, project, task) {
  const archived = project.status === 'ARCHIVED'
  const editableFields = archived ? [] : taskEditableFields(actor, project, task)
  return {
    editableFields,
    canEdit: editableFields.length > 0,
    canAssign: editableFields.includes('assigneeId'),
    canDelete: !archived && canManageTasks(actor, project),
    canComment: !archived && canComment(actor, project),
  }
}
