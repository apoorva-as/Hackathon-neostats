import { prisma } from '../config/prisma.js'
import {
  canAssignManager,
  canCreateProject,
  canDeleteProject,
  canEditProject,
  canViewProject,
  projectPermissions,
  ROLES,
  visibleProjectsWhere,
} from '../policies/project.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { pageMeta, paginate } from '../utils/pagination.js'

// Fields returned for a project (list and detail).
const projectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  managerId: true,
  manager: { select: { id: true, name: true, email: true } },
  _count: { select: { members: true } },
}

// Prisma's `_count.members` becomes a flat `memberCount`.
function toProjectDto(project) {
  const { _count, memberUserIds, ...rest } = project
  return { ...rest, memberCount: _count.members }
}

// Loads a project with what the permission checks need. 404 if missing.
async function loadProject(id) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { ...projectSelect, members: { select: { userId: true } } },
  })
  if (!project) {
    throw new ApiError(404, `Project ${id} was not found.`, 'PROJECT_NOT_FOUND')
  }
  const { members, ...rest } = project
  return { ...rest, memberUserIds: members.map((m) => m.userId) }
}

// Loads a project and checks the actor may see it (404 / 403).
// Also used by the membership service.
export async function getAccessibleProject(actor, id) {
  const project = await loadProject(id)
  if (!canViewProject(actor, project)) {
    throw new ApiError(403, 'You do not have access to this project.', 'FORBIDDEN')
  }
  return project
}

// A manager must be an existing, active user whose global role is PROJECT_MANAGER.
async function assertValidManager(managerId) {
  if (managerId === null || managerId === undefined) return
  const user = await prisma.user.findUnique({
    where: { id: managerId },
    select: { role: true, isActive: true },
  })
  if (!user) {
    throw new ApiError(400, `User ${managerId} does not exist.`, 'INVALID_MANAGER')
  }
  if (user.role !== ROLES.PROJECT_MANAGER) {
    throw new ApiError(400, 'Only users with the Project Manager role can manage a project.', 'INVALID_MANAGER')
  }
  if (!user.isActive) {
    throw new ApiError(400, 'A deactivated user cannot be assigned as project manager.', 'INVALID_MANAGER')
  }
}

// archivedAt follows status: set when entering ARCHIVED, cleared when leaving it.
function archivedAtFor(newStatus, current) {
  if (newStatus === undefined) return undefined // status not changing
  if (newStatus === 'ARCHIVED') return current?.status === 'ARCHIVED' ? current.archivedAt : new Date()
  return null
}

export async function listProjects(actor, query) {
  const where = {
    AND: [
      visibleProjectsWhere(actor),
      query.status ? { status: query.status } : {},
      query.managerId ? { managerId: query.managerId } : {},
      query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  }

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      select: projectSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...paginate(query),
    }),
  ])

  return { projects: projects.map(toProjectDto), meta: pageMeta(query, total) }
}

export async function getProject(actor, id) {
  const project = await getAccessibleProject(actor, id)
  return { ...toProjectDto(project), permissions: projectPermissions(actor, project) }
}

export async function createProject(actor, data) {
  if (!canCreateProject(actor)) {
    throw new ApiError(403, 'Only an Admin can create projects.', 'FORBIDDEN')
  }
  await assertValidManager(data.managerId)

  const created = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      managerId: data.managerId,
      archivedAt: archivedAtFor(data.status, null),
    },
    select: { id: true },
  })
  return getProject(actor, created.id)
}

export async function updateProject(actor, id, data) {
  const project = await getAccessibleProject(actor, id)
  if (!canEditProject(actor, project)) {
    throw new ApiError(403, 'You do not have permission to edit this project.', 'FORBIDDEN')
  }

  const changesManager = data.managerId !== undefined && data.managerId !== project.managerId
  if (changesManager) {
    if (!canAssignManager(actor)) {
      throw new ApiError(403, 'Only an Admin can assign project managers.', 'FORBIDDEN')
    }
    await assertValidManager(data.managerId)
  }

  await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      ...(changesManager ? { managerId: data.managerId } : {}),
      archivedAt: archivedAtFor(data.status, project),
    },
  })
  return getProject(actor, id)
}

// Memberships are removed by the ON DELETE CASCADE foreign key in the same
// statement, so no orphaned project_members rows can remain.
export async function deleteProject(actor, id) {
  await loadProject(id) // 404 if it does not exist
  if (!canDeleteProject(actor)) {
    throw new ApiError(403, 'Only an Admin can delete projects.', 'FORBIDDEN')
  }
  await prisma.project.delete({ where: { id } })
  return { id }
}
