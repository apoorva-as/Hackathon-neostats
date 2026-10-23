import { Link } from 'react-router'
import { StatusBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import { Alert, EmptyState, Spinner } from '../components/Feedback.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import { useDevUser } from '../context/DevUserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listProjects } from '../services/projects.js'
import { PROJECT_STATUSES, ROLE_LABELS, STATUS_LABELS } from '../utils/labels.js'
import { canCreateProject, projectsHeading, roleSummary } from '../utils/permissions.js'

// Role-aware overview: simple counts + recent projects (no analytics yet).
export default function DashboardPage() {
  const { currentUser } = useDevUser()
  const { data, loading, error, reload } = useApi(() => listProjects({ limit: 100 }), [])
  const projects = data?.items ?? []
  const counts = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, projects.filter((p) => p.status === s).length]))

  return (
    <>
      <PageHeader
        title={`Welcome, ${currentUser.name.split(' ')[0]}`}
        description={`${ROLE_LABELS[currentUser.role]} · ${roleSummary(currentUser.role)}`}
        actions={canCreateProject(currentUser) && <Button to="/projects/new" icon="plus">New project</Button>}
      />

      {loading && !data && <Spinner />}
      {error && <Alert onRetry={reload}>{error}</Alert>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Projects</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{data.meta.total}</p>
            </div>
            {PROJECT_STATUSES.map((status) => (
              <div key={status} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{STATUS_LABELS[status]}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{counts[status]}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card
              title={projectsHeading(currentUser.role)}
              className="lg:col-span-2"
              padded={false}
              actions={<Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View all</Link>}
            >
              {projects.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No projects to show">
                    {currentUser.role === 'TEAM_MEMBER'
                      ? 'You have not been added to any project yet.'
                      : currentUser.role === 'PROJECT_MANAGER'
                        ? 'No projects are assigned to you yet.'
                        : 'Create the first project to get started.'}
                  </EmptyState>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {projects.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {p.manager ? `Managed by ${p.manager.name}` : 'No manager'} · {p.memberCount} member{p.memberCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="My tasks">
              <div className="flex flex-col items-center py-4 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon name="tasks" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-900">Tasks are coming in Phase 2</p>
                <p className="mt-1 text-sm text-slate-500">Task lists, assignment and status updates are not built yet.</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
