import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listProjectTasks } from '../services/tasks.js'
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../utils/labels.js'
import Button from './Button.jsx'
import { Alert, EmptyState, Spinner } from './Feedback.jsx'
import { Card } from './PageHeader.jsx'
import TaskList from './TaskList.jsx'

const PAGE_SIZE = 20

// Task list on the project details page, with status / "mine" filters.
// "New task" only appears when the API says the user may manage tasks.
export default function ProjectTasksSection({ project }) {
  const { currentUser } = useAuth()
  const [status, setStatus] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [page, setPage] = useState(1)
  const params = { page, limit: PAGE_SIZE, ...(status ? { status } : {}), ...(mineOnly ? { assigneeId: currentUser.id } : {}) }
  const tasks = useApi(() => listProjectTasks(project.id, params), [project.id, status, mineOnly, page])
  const canCreate = project.permissions.canManageTasks && project.status !== 'ARCHIVED'
  const isTeamMember = currentUser.role === 'TEAM_MEMBER'
  const meta = tasks.data?.meta

  const filterButton = (value, label) => (
    <button
      key={value || 'all'}
      type="button"
      onClick={() => {
        setStatus(value)
        setPage(1)
      }}
      className={`rounded-full px-3 py-1 text-xs font-medium ${status === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )

  return (
    <Card
      title={`Tasks${meta ? ` · ${meta.total}` : ''}`}
      padded={false}
      actions={
        canCreate && (
          <Button size="sm" icon="plus" to={`/projects/${project.id}/tasks/new`}>
            New task
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        {filterButton('', 'All')}
        {TASK_STATUSES.map((s) => filterButton(s, TASK_STATUS_LABELS[s]))}
        {isTeamMember && (
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => {
                setMineOnly(e.target.checked)
                setPage(1)
              }}
              className="rounded border-slate-300"
            />
            Assigned to me
          </label>
        )}
      </div>

      {tasks.loading && !tasks.data && <Spinner label="Loading tasks…" />}
      {tasks.error && (
        <div className="p-5">
          <Alert onRetry={tasks.reload}>{tasks.error}</Alert>
        </div>
      )}
      {tasks.data && tasks.data.items.length === 0 && (
        <div className="p-5">
          <EmptyState icon="tasks" title={status || mineOnly ? 'No tasks match this filter' : 'No tasks yet'}>
            {canCreate && !status && !mineOnly ? 'Create the first task for this project.' : undefined}
          </EmptyState>
        </div>
      )}
      {tasks.data && tasks.data.items.length > 0 && <TaskList tasks={tasks.data.items} />}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="secondary" icon="left" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </span>
        </div>
      )}
    </Card>
  )
}
