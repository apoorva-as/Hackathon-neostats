import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Avatar, PriorityBadge, StatusBadge, TaskStatusBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import CommentsSection from '../components/CommentsSection.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Alert, Spinner } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage, isVersionConflict } from '../services/api.js'
import { listMembers } from '../services/projects.js'
import { deleteTask, getTask, updateTask } from '../services/tasks.js'
import { TASK_STATUSES, TASK_STATUS_LABELS, formatDate, formatDueDate, isOverdue } from '../utils/labels.js'
import { eligibleAssignees, hasChanges, taskToFormValues, toUpdatePayload } from '../utils/taskForm.js'

function DetailRow({ label, children }) {
  return (
    <div className="py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

// Shown after a 409: the task changed on the server; nothing was overwritten.
function ConflictAlert({ message, onReload }) {
  return (
    <Alert type="warning">
      <p className="font-medium">This task changed since you opened it. Your change was not saved.</p>
      <p className="mt-1">{message}</p>
      <button type="button" onClick={onReload} className="mt-2 font-medium underline underline-offset-2">
        Reload the latest version
      </button>
    </Alert>
  )
}

export default function TaskDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: task, loading, error, reload } = useApi(() => getTask(id), [id])
  const canAssign = Boolean(task?.permissions.canAssign)
  const members = useApi(() => (canAssign ? listMembers(task.projectId) : Promise.resolve([])), [task?.projectId, canAssign])

  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [editing, setEditing] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  if (loading && !task) return <Spinner />
  if (error) {
    return (
      <>
        <PageHeader title="Task" back={{ to: '/projects', label: 'Projects' }} />
        <Alert onRetry={reload}>{error}</Alert>
      </>
    )
  }

  const { permissions } = task
  const canChangeStatus = permissions.editableFields.includes('status')
  const archived = task.project.status === 'ARCHIVED'
  const back = { to: `/projects/${task.projectId}`, label: task.project.name }

  function reloadLatest() {
    setConflict(null)
    setActionError(null)
    reload()
  }

  // Quick status change: sends only { version, status }.
  async function handleStatusChange(status) {
    setStatusSaving(true)
    setActionError(null)
    setConflict(null)
    try {
      await updateTask(task.id, { version: task.version, status })
      setNotice(`Status changed to "${TASK_STATUS_LABELS[status]}".`)
      reload()
    } catch (err) {
      if (isVersionConflict(err)) setConflict(getErrorMessage(err))
      else setActionError(getErrorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  // Errors (including 409) are thrown back to TaskForm, which shows them.
  async function handleSave(values) {
    const payload = toUpdatePayload(values, task, permissions.editableFields)
    if (!hasChanges(payload)) {
      setEditing(false)
      return
    }
    await updateTask(task.id, payload)
    setEditing(false)
    setNotice('Task saved.')
    reload()
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTask(task.id)
      navigate(`/projects/${task.projectId}`, { state: { notice: `Task "${task.title}" was deleted.` } })
    } catch (err) {
      setDeleteError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title={task.title}
        back={back}
        actions={
          <>
            {permissions.canEdit && !editing && (
              <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>
                {permissions.canAssign ? 'Edit' : 'Update'}
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => {
                  setDeleteError(null)
                  setConfirmDelete(true)
                }}
              >
                Delete
              </Button>
            )}
          </>
        }
      >
        <TaskStatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {!permissions.canEdit && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <Icon name="lock" className="h-3 w-3" /> Read-only
          </span>
        )}
      </PageHeader>

      <div className="mb-4 space-y-3">
        {notice && <Alert type="success" onDismiss={() => setNotice(null)}>{notice}</Alert>}
        {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}
        {conflict && <ConflictAlert message={conflict} onReload={reloadLatest} />}
        {archived && <Alert type="info">This task belongs to an archived project and is read-only.</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {editing ? (
            <Card title={permissions.canAssign ? 'Edit task' : 'Update your task'}>
              {!permissions.canAssign && (
                <p className="mb-4 text-sm text-slate-500">As the assignee you can change the status and description.</p>
              )}
              <TaskForm
                // Remount with fresh values whenever a newer version is loaded.
                key={task.version}
                initialValues={taskToFormValues(task)}
                editableFields={permissions.editableFields}
                assignees={eligibleAssignees(members.data ?? [])}
                submitLabel="Save changes"
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
                onReloadLatest={reloadLatest}
              />
              {members.error && <p className="mt-3 text-sm text-red-600">{members.error}</p>}
            </Card>
          ) : (
            <Card title="Description">
              {task.description ? (
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{task.description}</p>
              ) : (
                <p className="text-sm italic text-slate-400">No description.</p>
              )}
            </Card>
          )}

          <CommentsSection task={task} canComment={permissions.canComment} onChanged={reload} />
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="-my-2.5 divide-y divide-slate-100">
              <DetailRow label="Status">
                {canChangeStatus && !editing ? (
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusSaving}
                    aria-label="Task status"
                    className={inputClass(false)}
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
              </DetailRow>
              <DetailRow label="Assignee">
                {task.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={task.assignee.name} id={task.assignee.id} size="sm" />
                    <span>
                      {task.assignee.name}
                      <span className="block text-xs text-slate-500">{task.assignee.email}</span>
                    </span>
                  </span>
                ) : (
                  <span className="italic text-slate-400">Unassigned</span>
                )}
              </DetailRow>
              <DetailRow label="Priority">
                <PriorityBadge priority={task.priority} />
              </DetailRow>
              <DetailRow label="Due date">
                <span className={isOverdue(task) ? 'font-medium text-red-600' : ''}>
                  {formatDueDate(task.dueDate)}
                  {isOverdue(task) && ' · overdue'}
                </span>
              </DetailRow>
              <DetailRow label="Project">
                <span className="flex flex-wrap items-center gap-2">
                  {task.project.name} <StatusBadge status={task.project.status} />
                </span>
              </DetailRow>
              <DetailRow label="Created">{formatDate(task.createdAt)}</DetailRow>
              <DetailRow label="Last updated">
                {formatDate(task.updatedAt)} <span className="text-xs text-slate-500">· version {task.version}</span>
              </DetailRow>
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        confirmLabel="Delete task"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <strong>{task.title}</strong> and its {task.commentCount} comment{task.commentCount === 1 ? '' : 's'} will be
        permanently deleted.
      </ConfirmDialog>
    </>
  )
}
