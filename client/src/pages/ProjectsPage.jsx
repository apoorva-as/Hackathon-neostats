import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../components/Button.jsx'
import { Alert, EmptyState, Skeleton } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import ProjectList from '../components/ProjectList.jsx'
import { SegmentedControl } from '../components/Tabs.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listProjects } from '../services/projects.js'
import { listAllTasks } from '../services/tasks.js'
import { listUsers } from '../services/users.js'
import { PROJECT_STATUSES, STATUS_LABELS } from '../utils/labels.js'
import { canCreateProject, projectsHeading } from '../utils/permissions.js'
import { PROJECT_SORTS, contributorsByProject, progressByProject, progressFor, sortProjects } from '../utils/workspaceStats.js'

// 100 = the API maximum. Search / status / manager filters run on the server;
// sorting runs on the loaded page.
const PAGE_SIZE = 100
const VIEW_KEY = 'worksphere.projectsView'

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function ProjectsPage() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = currentUser.role === 'ADMIN'
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [managerId, setManagerId] = useState('')
  const [sort, setSort] = useState('updated')
  const [view, setView] = useState(readView)
  const [page, setPage] = useState(1)

  // Clear the one-time notice from history so a refresh does not show it again.
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  // Debounce the search box so we do not call the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, loading, error, reload } = useApi(
    () =>
      listProjects({
        page,
        limit: PAGE_SIZE,
        ...(search && { search }),
        ...(status && { status }),
        ...(managerId && { managerId }),
      }),
    [page, search, status, managerId],
  )
  // Tasks feed the progress bars and contributor avatars (same visibility rules).
  const tasks = useApi(() => listAllTasks(), [])
  // Only Admins can list users, so only they get the manager filter.
  const managers = useApi(() => (isAdmin ? listUsers({ role: 'PROJECT_MANAGER' }) : Promise.resolve(null)), [isAdmin])

  const filtered = Boolean(search || status || managerId)
  const progress = progressByProject(tasks.data?.items ?? [])
  const contributors = contributorsByProject(tasks.data?.items ?? [])
  const projects = data ? sortProjects(data.items, sort) : []

  function changeView(next) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Not remembered when storage is unavailable.
    }
  }

  return (
    <>
      <PageHeader
        title={isAdmin || currentUser.role === 'VIEWER' ? 'Projects' : 'My projects'}
        description={
          isAdmin
            ? 'Plan, organize and track all your projects.'
            : `${projectsHeading(currentUser.role)}${currentUser.role === 'VIEWER' ? ' (read-only)' : ''}.`
        }
        actions={
          canCreateProject(currentUser) && (
            <Button to="/projects/new" icon="plus">
              New project
            </Button>
          )
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-card lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className={`${inputClass(false)} pl-9 shadow-none`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by status"
            className={`${inputClass(false)} shadow-none sm:w-40`}
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={managerId}
              onChange={(e) => {
                setManagerId(e.target.value)
                setPage(1)
              }}
              aria-label="Filter by project manager"
              className={`${inputClass(false)} shadow-none sm:w-48`}
            >
              <option value="">All managers</option>
              {(managers.data?.items ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort projects" className={`${inputClass(false)} shadow-none sm:w-44`}>
            {Object.entries(PROJECT_SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3 lg:ml-auto">
          {data && (
            <span className="text-xs text-slate-500 lg:hidden">
              {data.meta.total} project{data.meta.total === 1 ? '' : 's'}
            </span>
          )}
          <SegmentedControl
            label="View"
            value={view}
            onChange={changeView}
            options={[
              { value: 'grid', label: 'Grid', icon: 'grid' },
              { value: 'list', label: 'List', icon: 'list' },
            ]}
          />
        </div>
      </div>

      {error && <Alert onRetry={reload}>{error}</Alert>}
      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-xl" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title={filtered ? 'No matching projects' : 'No projects yet'}
          action={
            !filtered &&
            canCreateProject(currentUser) && (
              <Button to="/projects/new" icon="plus">
                New project
              </Button>
            )
          }
        >
          {filtered ? 'Try a different search or filter.' : `${projectsHeading(currentUser.role)} will appear here.`}
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          {view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  index={i}
                  project={project}
                  progress={progressFor(progress, project.id)}
                  contributors={contributors.get(project.id) ?? []}
                />
              ))}
            </div>
          ) : (
            <ProjectList projects={projects} progress={progress} />
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span className="hidden lg:inline">
              {data.meta.total} project{data.meta.total === 1 ? '' : 's'}
            </span>
            {data.meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon="left" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <span className="tabular-nums">
                  {data.meta.page} / {data.meta.totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
