import { useEffect, useState } from 'react'
import { Alert, EmptyState, Skeleton } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import { SegmentedControl } from '../components/Tabs.jsx'
import TaskBoard from '../components/TaskBoard.jsx'
import TaskList from '../components/TaskList.jsx'
import TaskQuickView from '../components/TaskQuickView.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { useBoardTasks } from '../hooks/useBoardTasks.js'
import { listAllProjects } from '../services/projects.js'
import { listAllTasks } from '../services/tasks.js'
import { PRIORITY_LABELS, TASK_PRIORITIES } from '../utils/labels.js'
import { canChangeTaskStatus } from '../utils/permissions.js'
import { taskStatusCounts } from '../utils/workspaceStats.js'

const VIEW_KEY = 'worksphere.tasksView'

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'
  } catch {
    return 'board'
  }
}

// /tasks: every task the user can see (the API applies role visibility).
// Team Members start with "Assigned to me". Board cards can be dragged
// between columns when the user may change that task's status.
export default function TasksPage() {
  const { currentUser } = useAuth()
  const isTeamMember = currentUser.role === 'TEAM_MEMBER'
  const [view, setView] = useState(readView)
  const [mineOnly, setMineOnly] = useState(isTeamMember)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState('')
  const [openTaskId, setOpenTaskId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const projects = useApi(() => listAllProjects(), [])
  const board = useBoardTasks(
    () =>
      listAllTasks({
        ...(mineOnly ? { assigneeId: currentUser.id } : {}),
        ...(search ? { search } : {}),
        ...(projectId ? { projectId } : {}),
        ...(priority ? { priority } : {}),
      }),
    [mineOnly, search, projectId, priority, currentUser.id],
  )

  function changeView(next) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Not remembered when storage is unavailable.
    }
  }

  const counts = taskStatusCounts(board.tasks)
  const filtered = Boolean(search || projectId || priority)
  const readOnly = currentUser.role === 'ADMIN' || currentUser.role === 'VIEWER'

  return (
    <>
      <PageHeader
        title={isTeamMember ? 'My tasks' : 'Tasks'}
        description={
          isTeamMember
            ? 'Everything assigned to you, across your projects. Drag a card to update its status.'
            : currentUser.role === 'PROJECT_MANAGER'
              ? 'All tasks in the projects you manage. Drag cards between columns to change status.'
              : 'All tasks across the workspace (read-only).'
        }
        actions={
          <SegmentedControl
            label="View"
            value={view}
            onChange={changeView}
            options={[
              { value: 'board', label: 'Board', icon: 'board' },
              { value: 'list', label: 'List', icon: 'list' },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'To do', value: counts.TODO, dot: 'bg-slate-400' },
          { label: 'In progress', value: counts.IN_PROGRESS, dot: 'bg-brand-500' },
          { label: 'Done', value: counts.DONE, dot: 'bg-emerald-500' },
          { label: 'Overdue', value: counts.overdue, dot: 'bg-red-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-card">
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            <span className="text-sm text-slate-500">{item.label}</span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-slate-900">{board.data ? item.value : '–'}</span>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className={`${inputClass(false)} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Filter by project" className={`${inputClass(false)} sm:w-52`}>
            <option value="">All projects</option>
            {(projects.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority" className={`${inputClass(false)} sm:w-40`}>
            <option value="">Any priority</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        {isTeamMember && (
          <label className="flex items-center gap-2 text-sm text-slate-600 lg:ml-auto">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
            Assigned to me only
          </label>
        )}
        {readOnly && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500 lg:ml-auto">
            <Icon name="lock" className="h-3.5 w-3.5" /> Your role can view tasks but not change them.
          </span>
        )}
      </div>

      {board.error && <Alert onRetry={board.reload}>{board.error}</Alert>}

      {board.loading && !board.data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      )}

      {board.data && board.tasks.length === 0 && (
        <EmptyState icon="tasks" title={filtered ? 'No tasks match these filters' : mineOnly ? 'Nothing assigned to you' : 'No tasks yet'}>
          {filtered
            ? 'Try a different search, project or priority.'
            : mineOnly
              ? 'When a project manager assigns you a task, it will appear here.'
              : 'Tasks created in your projects will appear here.'}
        </EmptyState>
      )}

      {board.data && board.tasks.length > 0 && (
        <div className={board.loading ? 'opacity-70 transition-opacity' : ''}>
          {view === 'board' ? (
            <TaskBoard
              tasks={board.tasks}
              canDrag={(task) => canChangeTaskStatus(currentUser, task)}
              onMove={board.moveTask}
              onOpen={(task) => setOpenTaskId(task.id)}
              savingId={board.savingId}
            />
          ) : (
            <Card padded={false}>
              <TaskList tasks={board.tasks} showProject />
            </Card>
          )}
        </div>
      )}

      <TaskQuickView taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={board.replaceTask} />
    </>
  )
}
