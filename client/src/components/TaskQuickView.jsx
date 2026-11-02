import { useState } from 'react'
import { Link } from 'react-router'
import { useToast } from '../context/ToastContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage, isVersionConflict } from '../services/api.js'
import { getTask, updateTask } from '../services/tasks.js'
import { formatDate, formatDueDate, isOverdue, TASK_STATUSES, TASK_STATUS_LABELS } from '../utils/labels.js'
import { relativeDue } from '../utils/workspaceStats.js'
import { Avatar, PriorityBadge, StatusBadge, TaskStatusBadge } from './Badges.jsx'
import Button from './Button.jsx'
import CommentsSection from './CommentsSection.jsx'
import Drawer from './Drawer.jsx'
import { Alert, Skeleton } from './Feedback.jsx'
import Icon from './Icon.jsx'

function Row({ icon, label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 py-2">
      <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon name={icon} className="h-3.5 w-3.5 text-slate-400" />
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

function Body({ taskId, onChanged }) {
  const toast = useToast()
  const { data: task, loading, error, reload } = useApi(() => getTask(taskId), [taskId])
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)

  if (loading && !task) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-5">
        <Alert onRetry={reload}>{error}</Alert>
      </div>
    )
  }

  const canChangeStatus = task.permissions.editableFields.includes('status')

  async function changeStatus(status) {
    setSaving(true)
    setConflict(false)
    try {
      const updated = await updateTask(task.id, { version: task.version, status })
      toast.success(`Status changed to ${TASK_STATUS_LABELS[status]}.`)
      onChanged?.(updated)
      reload()
    } catch (err) {
      if (isVersionConflict(err)) setConflict(true)
      else toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {!task.permissions.canEdit && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <Icon name="lock" className="h-3 w-3" /> Read-only
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-slate-900">{task.title}</h2>

        {conflict && (
          <Alert type="warning">
            <p className="font-medium">This task changed since you opened it. Your change was not saved.</p>
            <button
              type="button"
              onClick={() => {
                setConflict(false)
                reload()
              }}
              className="mt-1 font-medium underline underline-offset-2"
            >
              Reload the latest version
            </button>
          </Alert>
        )}

        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
          <Row icon="todo" label="Status">
            {canChangeStatus ? (
              <select
                value={task.status}
                disabled={saving}
                onChange={(e) => changeStatus(e.target.value)}
                aria-label="Task status"
                className="h-8 rounded-md border-0 bg-slate-50 px-2 text-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            ) : (
              <TaskStatusBadge status={task.status} />
            )}
          </Row>
          <Row icon="user" label="Assignee">
            {task.assignee ? (
              <span className="flex items-center gap-2">
                <Avatar name={task.assignee.name} id={task.assignee.id} size="xs" />
                <span className="truncate">{task.assignee.name}</span>
              </span>
            ) : (
              <span className="italic text-slate-400">Unassigned</span>
            )}
          </Row>
          <Row icon="flag" label="Priority">
            <PriorityBadge priority={task.priority} />
          </Row>
          <Row icon="calendar" label="Due date">
            <span className={isOverdue(task) ? 'font-medium text-red-600' : ''}>
              {formatDueDate(task.dueDate)}
              {task.dueDate && <span className="ml-2 text-xs font-normal text-slate-500">{relativeDue(task.dueDate)}</span>}
            </span>
          </Row>
          <Row icon="folder" label="Project">
            <Link to={`/projects/${task.projectId}`} className="flex flex-wrap items-center gap-2 hover:text-brand-600">
              {task.project.name} <StatusBadge status={task.project.status} />
            </Link>
          </Row>
          <Row icon="clock" label="Updated">
            {formatDate(task.updatedAt)}
          </Row>
        </dl>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h3>
          {task.description ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm italic text-slate-400">No description.</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 p-5">
        <CommentsSection task={task} canComment={task.permissions.canComment} onChanged={reload} />
      </div>
    </div>
  )
}

// Task quick view opened from boards. The full page (/tasks/:id) keeps all
// editing features (edit form, delete, conflict handling).
export default function TaskQuickView({ taskId, onClose, onChanged }) {
  return (
    <Drawer
      open={Boolean(taskId)}
      onClose={onClose}
      title={<p className="text-sm font-medium text-slate-500">Task details</p>}
      footer={
        taskId && (
          <div className="flex justify-end">
            <Button to={`/tasks/${taskId}`} variant="secondary" size="sm" iconRight="arrow-up-right">
              Open full task
            </Button>
          </div>
        )
      }
    >
      {taskId && <Body key={taskId} taskId={taskId} onChanged={onChanged} />}
    </Drawer>
  )
}
