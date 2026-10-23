import { prisma } from '../config/prisma.js'
import { ROLES, visibleProjectsWhere } from '../policies/project.policy.js'
import { canManageTasks, canViewTasks, taskEditableFields, taskPermissions } from '../policies/task.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { pageMeta, paginate } from '../utils/pagination.js'

// Fields returned for a task (list and detail).
const taskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  assigneeId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, status: true } },
  _count: { select: { comments: true } },
}

// What the permission checks need to know about a project.
const projectContextSelect = {
  id: true,
  name: true,
  status: true,
  managerId: true,
  members: { select: { userId: true, role: true } },
}

// Flattens `_count` and turns the due date into "YYYY-MM-DD".
function toTaskDto(task) {
  const { _count, ...rest } = task
  return {
    ...rest,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    commentCount: _count.comments,
  }
}

function toProjectContext(project) {
  return { ...project, memberUserIds: project.members.map((m) => m.userId) }
}

// "YYYY-MM-DD" (already validated) → Date at UTC midnight; null stays null.
const toDueDate = (value) => (value ? new Date(`${value}T00:00:00.000Z`) : value)

export const archivedError = () =>
  new ApiError(409, 'This project is archived. Its tasks and comments are read-only.', 'PROJECT_ARCHIVED')

async function loadProjectContext(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: projectContextSelect })
  if (!project) throw new ApiError(404, `Project ${projectId} was not found.`, 'PROJECT_NOT_FOUND')
  return toProjectContext(project)
}

async function getViewableProject(actor, projectId) {
  const project = await loadProjectContext(projectId)
  if (!canViewTasks(actor, project)) {
    throw new ApiError(403, 'You do not have access to this project.', 'FORBIDDEN')
  }
  return project
}

async function findTask(taskId) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: taskSelect })
  return task ? toTaskDto(task) : null
}

// Loads a task plus its project context and checks the actor may see it
// (404 / 403). Also used by the comment service.
export async function getAccessibleTask(actor, taskId) {
  const row = await prisma.task.findUnique({
    where: { id: taskId },
    select: { ...taskSelect, project: { select: projectContextSelect } },
  })
  if (!row) throw new ApiError(404, `Task ${taskId} was not found.`, 'TASK_NOT_FOUND')
  const project = toProjectContext(row.project)
  if (!canViewTasks(actor, project)) {
    throw new ApiError(403, 'You do not have access to this task.', 'FORBIDDEN')
  }
  const task = toTaskDto({ ...row, project: { id: project.id, name: project.name, status: project.status } })
  return { task, project }
}

// The assignee must be an active TEAM_MEMBER who works on THIS project
// (membership with project role MEMBER; read-only VIEWER members cannot be assigned).
async function assertValidAssignee(project, assigneeId) {
  if (assigneeId === null || assigneeId === undefined) return
  const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true, isActive: true } })
  if (!user) {
    throw new ApiError(400, `User ${assigneeId} does not exist.`, 'INVALID_ASSIGNEE')
  }
  if (user.role !== ROLES.TEAM_MEMBER) {
    throw new ApiError(400, 'Tasks can only be assigned to users with the Team Member role.', 'INVALID_ASSIGNEE')
  }
  if (!user.isActive) {
    throw new ApiError(400, 'A deactivated user cannot be assigned a task.', 'INVALID_ASSIGNEE')
  }
  const membership = project.members.find((m) => m.userId === assigneeId)
  if (!membership) {
    throw new ApiError(400, 'The assignee must be a member of this project.', 'INVALID_ASSIGNEE')
  }
  if (membership.role !== 'MEMBER') {
    throw new ApiError(400, 'Read-only project members cannot be assigned tasks.', 'INVALID_ASSIGNEE')
  }
}

function filterWhere(query) {
  return [
    query.status ? { status: query.status } : {},
    query.priority ? { priority: query.priority } : {},
    query.assigneeId ? { assigneeId: query.assigneeId } : {},
    query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {},
  ]
}

// Open work first, highest priority first, earliest due date first.
const taskOrder = [{ status: 'asc' }, { priority: 'desc' }, { dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]

async function findTaskPage(where, query) {
  const [total, tasks] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, select: taskSelect, orderBy: taskOrder, ...paginate(query) }),
  ])
  return { tasks: tasks.map(toTaskDto), meta: pageMeta(query, total) }
}

// GET /api/projects/:id/tasks
export async function listProjectTasks(actor, projectId, query) {
  await getViewableProject(actor, projectId)
  return findTaskPage({ AND: [{ projectId }, ...filterWhere(query)] }, query)
}

// GET /api/tasks: tasks in every project the actor can see (e.g. "my tasks").
export async function listTasks(actor, query) {
  const where = {
    AND: [{ project: visibleProjectsWhere(actor) }, query.projectId ? { projectId: query.projectId } : {}, ...filterWhere(query)],
  }
  return findTaskPage(where, query)
}

export async function getTask(actor, taskId) {
  const { task, project } = await getAccessibleTask(actor, taskId)
  return { ...task, permissions: taskPermissions(actor, project, task) }
}

export async function createTask(actor, projectId, data) {
  const project = await getViewableProject(actor, projectId)
  if (!canManageTasks(actor, project)) {
    throw new ApiError(403, 'Only this project\'s manager can create tasks.', 'FORBIDDEN')
  }
  if (project.status === 'ARCHIVED') throw archivedError()
  await assertValidAssignee(project, data.assigneeId)

  const created = await prisma.task.create({
    data: { ...data, projectId, dueDate: toDueDate(data.dueDate) },
    select: { id: true },
  })
  return getTask(actor, created.id)
}

// Optimistic concurrency: the UPDATE only matches when the row still has the
// version the client read, and increments it in the same statement. Two
// requests with the same version cannot both match, so the second gets 409.
export async function updateTask(actor, taskId, { version, ...changes }) {
  const { task, project } = await getAccessibleTask(actor, taskId)
  if (project.status === 'ARCHIVED') throw archivedError()

  const allowed = taskEditableFields(actor, project, task)
  if (allowed.length === 0) {
    throw new ApiError(403, 'You do not have permission to edit this task.', 'FORBIDDEN')
  }
  const notAllowed = Object.keys(changes).filter((field) => !allowed.includes(field))
  if (notAllowed.length > 0) {
    throw new ApiError(
      403,
      `You may only change: ${allowed.join(', ')}. Not allowed: ${notAllowed.join(', ')}.`,
      'FORBIDDEN',
    )
  }
  if (changes.assigneeId !== undefined && changes.assigneeId !== task.assigneeId) {
    await assertValidAssignee(project, changes.assigneeId)
  }

  const data = { ...changes, version: { increment: 1 } }
  if (changes.dueDate !== undefined) data.dueDate = toDueDate(changes.dueDate)

  const result = await prisma.task.updateMany({ where: { id: taskId, version }, data })
  if (result.count === 0) {
    const current = await findTask(taskId)
    if (!current) throw new ApiError(404, `Task ${taskId} was not found.`, 'TASK_NOT_FOUND')
    throw new ApiError(
      409,
      'This task was changed by someone else after you opened it. Reload it to see the latest version, then reapply your changes.',
      'VERSION_CONFLICT',
      undefined,
      { currentVersion: current.version, currentTask: current },
    )
  }
  return getTask(actor, taskId)
}

// Comments are removed by the ON DELETE CASCADE foreign key.
export async function deleteTask(actor, taskId) {
  const { project } = await getAccessibleTask(actor, taskId)
  if (!canManageTasks(actor, project)) {
    throw new ApiError(403, 'Only this project\'s manager can delete tasks.', 'FORBIDDEN')
  }
  if (project.status === 'ARCHIVED') throw archivedError()
  await prisma.task.delete({ where: { id: taskId } })
  return { id: taskId }
}
