import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { canManageMembers, ROLES } from '../policies/project.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { getAccessibleProject } from './project.service.js'

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
}

const isPrismaError = (err, code) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code

// Loads the project and checks the actor may change its team.
async function getManageableProject(actor, projectId) {
  const project = await getAccessibleProject(actor, projectId)
  if (!canManageMembers(actor, project)) {
    throw new ApiError(403, 'Only an Admin or this project\'s manager can change its team.', 'FORBIDDEN')
  }
  if (project.status === 'ARCHIVED') {
    throw new ApiError(409, 'This project is archived. Un-archive it before changing the team.', 'PROJECT_ARCHIVED')
  }
  return project
}

export async function listMembers(actor, projectId) {
  await getAccessibleProject(actor, projectId)
  return prisma.projectMember.findMany({
    where: { projectId },
    select: memberSelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

// Only active users with the global role TEAM_MEMBER can join a team.
// (The manager is linked through Project.managerId, never through this table,
// so a membership row can never contradict the manager assignment.)
export async function addMember(actor, projectId, { userId, role }) {
  await getManageableProject(actor, projectId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  })
  if (!user) {
    throw new ApiError(400, `User ${userId} does not exist.`, 'INVALID_MEMBER')
  }
  if (user.role !== ROLES.TEAM_MEMBER) {
    throw new ApiError(400, 'Only users with the Team Member role can be added to a project team.', 'INVALID_MEMBER')
  }
  if (!user.isActive) {
    throw new ApiError(400, 'A deactivated user cannot be added to a project.', 'INVALID_MEMBER')
  }

  try {
    // The unique (projectId, userId) constraint is the real duplicate guard,
    // so two simultaneous requests cannot both succeed.
    return await prisma.projectMember.create({
      data: { projectId, userId, role },
      select: memberSelect,
    })
  } catch (err) {
    if (isPrismaError(err, 'P2002')) {
      throw new ApiError(409, 'This user is already a member of the project.', 'ALREADY_MEMBER')
    }
    throw err
  }
}

export async function updateMemberRole(actor, projectId, userId, { role }) {
  await getManageableProject(actor, projectId)
  try {
    return await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      select: memberSelect,
    })
  } catch (err) {
    if (isPrismaError(err, 'P2025')) {
      throw new ApiError(404, 'This user is not a member of the project.', 'MEMBER_NOT_FOUND')
    }
    throw err
  }
}

// Deletes only the membership row; the user account is untouched.
export async function removeMember(actor, projectId, userId) {
  await getManageableProject(actor, projectId)
  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    })
  } catch (err) {
    if (isPrismaError(err, 'P2025')) {
      throw new ApiError(404, 'This user is not a member of the project.', 'MEMBER_NOT_FOUND')
    }
    throw err
  }
  return { projectId, userId }
}
