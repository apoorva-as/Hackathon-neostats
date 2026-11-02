import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Avatar, StatusBadge, TaskStatusBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { TaskRows } from '../components/dashboard/Widgets.jsx'
import { Alert, Skeleton } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import { Card } from '../components/PageHeader.jsx'
import ProjectTasksSection from '../components/ProjectTasksSection.jsx'
import { ProgressRing, SegmentedBar } from '../components/ProgressBar.jsx'
import { Tabs } from '../components/Tabs.jsx'
import TaskBoard from '../components/TaskBoard.jsx'
import TaskQuickView from '../components/TaskQuickView.jsx'
import TeamSection from '../components/TeamSection.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { useBoardTasks } from '../hooks/useBoardTasks.js'
import { getErrorMessage } from '../services/api.js'
import { deleteProject, getProject, updateProject } from '../services/projects.js'
import { listAllProjectTasks } from '../services/tasks.js'
import { listUsers } from '../services/users.js'
import { TASK_STATUSES, TASK_STATUS_LABELS, formatDate } from '../utils/labels.js'
import { canChangeTaskStatus } from '../utils/permissions.js'
import { TASK_STATUS_DOTS } from '../utils/statusColors.js'
import { overdueTasks, recentlyUpdated, taskStatusCounts, upcomingTasks } from '../utils/workspaceStats.js'

// Admin-only: assign or change the project manager in place.
function ManagerAssignment({ project, onAssigned }) {
  const managers = useApi(() => listUsers({ role: 'PROJECT_MANAGER', isActive: 'true' }), [])
  const [managerId, setManagerId] = useState(project.managerId ? String(project.managerId) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const unchanged = (managerId || null) === (project.managerId ? String(project.managerId) : null)

  async function handleAssign() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProject(project.id, { managerId: managerId ? Number(managerId) : null })
      onAssigned(updated.manager ? `${updated.manager.name} now manages this project.` : 'The project manager was unassigned.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          disabled={managers.loading}
          aria-label="Project manager"
          className={`${inputClass(false)} flex-1`}
        >
          <option value="">No manager</option>
          {(managers.data?.items ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={handleAssign} loading={saving} disabled={unchanged}>
          Assign
        </Button>
      </div>
      {(error || managers.error) && <p className="text-sm text-red-600">{error || managers.error}</p>}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="py-2.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

const TABS = ['overview', 'board', 'list', 'team']

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const { data: project, loading, error, reload } = useApi(() => getProject(id), [id])
  const board = useBoardTasks(() => listAllProjectTasks(id), [id])
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [openTaskId, setOpenTaskId] = useState(null)

  useEffect(() => {
    if (location.state?.notice) navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate])

  if (loading && !project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <>
        <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <Icon name="left" className="h-4 w-4" /> Projects
        </Link>
        <Alert onRetry={reload}>{error}</Alert>
      </>
    )
  }

  const { permissions } = project
  const readOnly = !permissions.canEdit && !permissions.canManageMembers && !permissions.canManageTasks
  const archived = project.status === 'ARCHIVED'
  const canCreateTask = permissions.canManageTasks && !archived
  const tasks = board.tasks
  const counts = taskStatusCounts(tasks)
  const percent = counts.total === 0 ? 0 : Math.round((counts.DONE / counts.total) * 100)

  function setTab(next) {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteProject(project.id)
      navigate('/projects', { state: { notice: `Project "${project.name}" was deleted.` } })
    } catch (err) {
      setDeleteError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <>
      <Link to="/projects" className="group mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900">
        <Icon name="left" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Projects
      </Link>

      {/* Project header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-sky-400" aria-hidden="true" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-lg font-bold text-white shadow-md shadow-brand-600/20">
              {project.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
                <StatusBadge status={project.status} />
                {readOnly && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Icon name="lock" className="h-3 w-3" /> Read-only
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-slate-500">{project.description || 'No description.'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  {project.manager ? (
                    <>
                      <Avatar name={project.manager.name} id={project.manager.id} size="xs" />
                      {project.manager.name}
                    </>
                  ) : (
                    <span className="italic text-slate-400">No manager</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="users" className="h-4 w-4 text-slate-400" /> {project.memberCount} member{project.memberCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4 text-slate-400" /> Started {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70">
              <ProgressRing value={percent} size={48} stroke={5} />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">Progress</p>
                <p className="text-slate-500">
                  {counts.DONE}/{counts.total} tasks
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreateTask && (
                <Button icon="plus" to={`/projects/${project.id}/tasks/new`}>
                  New task
                </Button>
              )}
              {permissions.canEdit && (
                <Button variant="secondary" icon="edit" to={`/projects/${project.id}/edit`}>
                  Edit
                </Button>
              )}
              {permissions.canDelete && (
                <Button
                  variant="ghost-danger"
                  icon="trash"
                  aria-label="Delete project"
                  onClick={() => {
                    setDeleteError(null)
                    setConfirmDelete(true)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mt-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}

      <Tabs
        className="mb-6 mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: 'dashboard' },
          { value: 'board', label: 'Board', icon: 'board', count: board.data ? counts.total : undefined },
          { value: 'list', label: 'List', icon: 'list' },
          { value: 'team', label: 'Team', icon: 'users', count: project.memberCount + (project.manager ? 1 : 0) },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid animate-fade-up gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="About" icon="folder">
              {project.description ? (
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{project.description}</p>
              ) : (
                <p className="text-sm italic text-slate-400">No description.</p>
              )}
            </Card>

            <Card title="Task summary" icon="tasks" actions={<button type="button" onClick={() => setTab('board')} className="text-xs font-medium text-brand-600 hover:text-brand-800">Open board</button>}>
              {board.error && <Alert onRetry={board.reload}>{board.error}</Alert>}
              {!board.data && !board.error && <Skeleton className="h-16" />}
              {board.data && (
                <>
                  <SegmentedBar
                    segments={TASK_STATUSES.map((s) => ({ key: s, label: TASK_STATUS_LABELS[s], value: counts[s], color: TASK_STATUS_DOTS[s] }))}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[...TASK_STATUSES.map((s) => ({ key: s, label: TASK_STATUS_LABELS[s], value: counts[s], dot: TASK_STATUS_DOTS[s] })), { key: 'overdue', label: 'Overdue', value: counts.overdue, dot: 'bg-red-500' }].map((item) => (
                      <div key={item.key} className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/60">
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card title="Upcoming deadlines" icon="calendar" padded={false}>
                <TaskRows tasks={upcomingTasks(tasks, undefined, 14)} emptyIcon="calendar" emptyText="Nothing due in the next 14 days." showProject={false} onOpen={(t) => setOpenTaskId(t.id)} />
              </Card>
              <Card title="Recently updated" icon="activity" padded={false}>
                <TaskRows tasks={recentlyUpdated(tasks, 5)} emptyText="No tasks yet." showProject={false} meta="updated" onOpen={(t) => setOpenTaskId(t.id)} />
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card title="Details" icon="settings">
              <dl className="-my-2.5 divide-y divide-slate-100">
                <DetailRow label="Project manager">
                  {project.manager ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={project.manager.name} id={project.manager.id} size="sm" />
                      <span>
                        {project.manager.name}
                        <span className="block text-xs text-slate-500">{project.manager.email}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Unassigned</span>
                  )}
                </DetailRow>
                {permissions.canAssignManager && (
                  <div className="py-2.5">
                    <ManagerAssignment
                      key={project.managerId ?? 'none'}
                      project={project}
                      onAssigned={(message) => {
                        setNotice(message)
                        reload()
                      }}
                    />
                  </div>
                )}
                <DetailRow label="Status">
                  <StatusBadge status={project.status} />
                </DetailRow>
                <DetailRow label="Members">{project.memberCount}</DetailRow>
                <DetailRow label="Created">{formatDate(project.createdAt)}</DetailRow>
                <DetailRow label="Last updated">{formatDate(project.updatedAt)}</DetailRow>
                {project.archivedAt && <DetailRow label="Archived">{formatDate(project.archivedAt)}</DetailRow>}
              </dl>
            </Card>

            <Card title={`Overdue · ${overdueTasks(tasks).length}`} icon="clock" padded={false}>
              <TaskRows tasks={overdueTasks(tasks)} emptyText="Nothing overdue." showProject={false} onOpen={(t) => setOpenTaskId(t.id)} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="animate-fade-up">
          {archived && (
            <div className="mb-4">
              <Alert type="info">This project is archived, so its tasks are read-only.</Alert>
            </div>
          )}
          {board.error && <Alert onRetry={board.reload}>{board.error}</Alert>}
          {!board.data && !board.error && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          )}
          {board.data && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Icon name="grip" className="h-3.5 w-3.5" />
                  {permissions.canManageTasks && !archived
                    ? 'Drag cards between columns to change their status.'
                    : currentUser.role === 'TEAM_MEMBER' && !archived
                      ? 'You can drag the tasks assigned to you.'
                      : 'Read-only board.'}
                </span>
                <span className="flex gap-2">
                  {TASK_STATUSES.map((s) => (
                    <TaskStatusBadge key={s} status={s} />
                  ))}
                </span>
              </div>
              <TaskBoard
                tasks={tasks}
                showProject={false}
                canDrag={(task) => canChangeTaskStatus(currentUser, task)}
                onMove={board.moveTask}
                onOpen={(task) => setOpenTaskId(task.id)}
                savingId={board.savingId}
              />
            </>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="animate-fade-up">
          <ProjectTasksSection project={project} />
        </div>
      )}

      {tab === 'team' && (
        <div className="animate-fade-up">
          <TeamSection
            project={project}
            onTeamChanged={() => {
              reload()
              board.reload()
            }}
          />
        </div>
      )}

      <TaskQuickView taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={board.replaceTask} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        confirmLabel="Delete project"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <strong>{project.name}</strong>, its tasks and comments, and its {project.memberCount} team membership
        {project.memberCount === 1 ? '' : 's'} will be permanently deleted. User accounts are not affected. To keep the history instead, set the status to Archived.
      </ConfirmDialog>
    </>
  )
}
