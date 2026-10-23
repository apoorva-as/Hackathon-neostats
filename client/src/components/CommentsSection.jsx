import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage } from '../services/api.js'
import { addComment, deleteComment, listComments } from '../services/tasks.js'
import { COMMENT_MAX, validateComment } from '../utils/taskForm.js'
import { Avatar, RoleBadge } from './Badges.jsx'
import Button from './Button.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { Alert, Spinner } from './Feedback.jsx'
import { inputClass } from './FormField.jsx'
import { Card } from './PageHeader.jsx'

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// Comment thread for one task. The form appears only when the API says the
// user may comment; each comment's delete button follows its `canDelete` hint.
export default function CommentsSection({ task, canComment, onChanged }) {
  const comments = useApi(() => listComments(task.id), [task.id])
  const [body, setBody] = useState('')
  const [formError, setFormError] = useState(null)
  const [posting, setPosting] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const problem = validateComment(body)
    if (problem) return setFormError(problem)
    setPosting(true)
    setFormError(null)
    try {
      await addComment(task.id, body.trim())
      setBody('')
      comments.reload()
      onChanged?.()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteComment(task.id, toDelete.id)
      setToDelete(null)
      comments.reload()
      onChanged?.()
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const list = comments.data?.items ?? []

  return (
    <Card title={`Comments${comments.data ? ` · ${comments.data.meta.total}` : ''}`} padded={false}>
      {comments.loading && !comments.data && <Spinner label="Loading comments…" />}
      {comments.error && (
        <div className="p-5">
          <Alert onRetry={comments.reload}>{comments.error}</Alert>
        </div>
      )}
      {comments.data && list.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No comments yet.</p>}
      {list.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {list.map((comment) => (
            <li key={comment.id} className="flex gap-3 px-5 py-4">
              <Avatar name={comment.author.name} id={comment.author.id} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{comment.author.name}</span>
                  <RoleBadge role={comment.author.role} />
                  <span className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{comment.body}</p>
              </div>
              {comment.canDelete && (
                <Button
                  variant="ghost-danger"
                  size="sm"
                  icon="trash"
                  aria-label="Delete comment"
                  onClick={() => {
                    setDeleteError(null)
                    setToDelete(comment)
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {canComment && (
        <form onSubmit={handleSubmit} noValidate className="space-y-2 border-t border-slate-100 p-5">
          <label htmlFor="comment-body" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            rows={3}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setFormError(null)
            }}
            className={inputClass(Boolean(formError))}
            placeholder="Write a comment…"
            maxLength={COMMENT_MAX}
          />
          <div className="flex items-center justify-between gap-3">
            <span className={`text-xs ${formError ? 'text-red-600' : 'text-slate-500'}`} role={formError ? 'alert' : undefined}>
              {formError ?? `${body.length}/${COMMENT_MAX}`}
            </span>
            <Button type="submit" size="sm" icon="comment" loading={posting} disabled={!body.trim()}>
              Comment
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this comment?"
        confirmLabel="Delete"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      >
        The comment will be permanently removed.
      </ConfirmDialog>
    </Card>
  )
}
