import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../components/Button.jsx'
import { Alert, EmptyState, Spinner } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectList from '../components/ProjectList.jsx'
import { useDevUser } from '../context/DevUserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listProjects } from '../services/projects.js'
import { PROJECT_STATUSES, STATUS_LABELS } from '../utils/labels.js'
import { canCreateProject, projectsHeading } from '../utils/permissions.js'

const PAGE_SIZE = 10

export default function ProjectsPage() {
  const { currentUser } = useDevUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
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
    () => listProjects({ page, limit: PAGE_SIZE, ...(search && { search }), ...(status && { status }) }),
    [page, search, status],
  )
  const filtered = Boolean(search || status)

  return (
    <>
      <PageHeader
        title={currentUser.role === 'ADMIN' || currentUser.role === 'VIEWER' ? 'Projects' : 'My projects'}
        description={projectsHeading(currentUser.role) + (currentUser.role === 'VIEWER' ? ' (read-only)' : '')}
        actions={canCreateProject(currentUser) && <Button to="/projects/new" icon="plus">New project</Button>}
      />

      {notice && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>{notice}</Alert>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className={`${inputClass(false)} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by status"
          className={`${inputClass(false)} sm:w-44`}
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert onRetry={reload}>{error}</Alert>}
      {loading && !data && <Spinner />}

      {data && data.items.length === 0 && (
        <EmptyState
          title={filtered ? 'No matching projects' : 'No projects yet'}
          action={!filtered && canCreateProject(currentUser) && <Button to="/projects/new" icon="plus">New project</Button>}
        >
          {filtered ? 'Try a different search or status filter.' : projectsHeading(currentUser.role) + ' will appear here.'}
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <ProjectList projects={data.items} />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
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
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
