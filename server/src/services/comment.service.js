import { prisma } from '../config/prisma.js'
import { canComment, canDeleteComment } from '../policies/task.policy.js'
import { ApiError } from '../utils/ApiError.js'
import { pageMeta, paginate } from '../utils/pagination.js'
import { archivedError, getAccessibleTask } from './task.service.js'

const commentSelect = {
  id: true,
  taskId: true,
  authorId: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, email: true, role: true } },
}

// Adds a per-comment `canDelete` UX hint (the server re-checks on DELETE).
const withPermissions = (actor, project, comment) => ({
  ...comment,
  canDelete: project.status !== 'ARCHIVED' && canDeleteComment(actor, project, comment),
})

// Oldest first, so the thread reads top to bottom.
export async function listComments(actor, taskId, query) {
  const { project } = await getAccessibleTask(actor, taskId)
  const where = { taskId }
  const [total, comments] = await prisma.$transaction([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      select: commentSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...paginate(query),
    }),
  ])
  return { comments: comments.map((c) => withPermissions(actor, project, c)), meta: pageMeta(query, total) }
}

// The author is always the current user (req.actor), never a client-supplied id.
export async function createComment(actor, taskId, { body }) {
  const { project } = await getAccessibleTask(actor, taskId)
  if (project.status === 'ARCHIVED') throw archivedError()
  if (!canComment(actor, project)) {
    throw new ApiError(403, 'You do not have permission to comment on this task.', 'FORBIDDEN')
  }
  const comment = await prisma.comment.create({
    data: { taskId, authorId: actor.id, body },
    select: commentSelect,
  })
  return withPermissions(actor, project, comment)
}

export async function deleteComment(actor, taskId, commentId) {
  const { project } = await getAccessibleTask(actor, taskId)
  // Looked up by BOTH ids so a comment cannot be deleted through another task's URL.
  const comment = await prisma.comment.findFirst({ where: { id: commentId, taskId }, select: { id: true, authorId: true } })
  if (!comment) throw new ApiError(404, `Comment ${commentId} was not found on this task.`, 'COMMENT_NOT_FOUND')
  if (project.status === 'ARCHIVED') throw archivedError()
  if (!canDeleteComment(actor, project, comment)) {
    throw new ApiError(403, 'You can only delete your own comments.', 'FORBIDDEN')
  }
  await prisma.comment.delete({ where: { id: commentId } })
  return { id: commentId, taskId }
}
