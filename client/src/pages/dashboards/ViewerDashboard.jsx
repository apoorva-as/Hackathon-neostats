import { Link } from 'react-router'
import { Avatar, StatusBadge } from '../../components/Badges.jsx'
import { DashboardSkeleton, Greeting, ProjectOverview, ProjectProgressList, RecentProjects } from '../../components/dashboard/Widgets.jsx'
import { Alert } from '../../components/Feedback.jsx'
import Icon from '../../components/Icon.jsx'
import { Card } from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import { useWorkspaceData } from '../../hooks/useWorkspaceData.js'
import { formatDate } from '../../utils/labels.js'
import { overallCompletion, progressByProject, progressFor, projectStatusCounts, recentlyUpdated } from '../../utils/workspaceStats.js'

// Viewer: read-only overview. No create, edit or delete actions anywhere.
export default function ViewerDashboard({ user }) {
  const { data, loading, error, reload } = useWorkspaceData()

  const greeting = (
    <Greeting
      role={user.role}
      title="Welcome to your workspace."
      description="Stay informed about project progress and team activities."
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
          <Icon name="eye" className="h-3.5 w-3.5" /> Read-only access
        </span>
      }
    />
  )

  if (error) {
    return (
      <>
        {greeting}
        <Alert onRetry={reload}>{error}</Alert>
      </>
    )
  }
  if (loading && !data) {
    return (
      <>
        {greeting}
        <DashboardSkeleton stats={3} />
      </>
    )
  }

  const { projects, tasks } = data
  const counts = projectStatusCounts(projects)
  const progress = progressByProject(tasks)

  return (
    <>
      {greeting}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard index={0} label="Total projects" value={counts.total} icon="projects" tone="brand" hint={`${tasks.length} tasks tracked`} to="/projects" />
        <StatCard index={1} label="Active projects" value={counts.ACTIVE} icon="zap" tone="emerald" hint={`${counts.ON_HOLD} on hold`} />
        <StatCard index={2} label="Completed projects" value={counts.COMPLETED} icon="check-circle" tone="sky" hint={`${counts.ARCHIVED} archived`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ProjectOverview counts={counts} completion={overallCompletion(tasks)} taskTotal={tasks.length} />
        <div className="lg:col-span-2">
          <ProjectProgressList projects={projects.filter((p) => p.status !== 'ARCHIVED')} progress={progress} emptyText="No active projects yet." />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Project status" icon="folder" padded={false}>
            {projects.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No projects yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                      <th className="px-5 py-2.5 font-medium">Project</th>
                      <th className="px-5 py-2.5 font-medium">Manager</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 text-right font-medium">Done</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.slice(0, 8).map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="max-w-[220px] px-5 py-3">
                          <Link to={`/projects/${p.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-700">
                            {p.name}
                          </Link>
                          <span className="text-xs text-slate-500">Updated {formatDate(p.updatedAt)}</span>
                        </td>
                        <td className="px-5 py-3">
                          {p.manager ? (
                            <span className="flex items-center gap-2 whitespace-nowrap text-slate-700">
                              <Avatar name={p.manager.name} id={p.manager.id} size="xs" />
                              {p.manager.name}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{progressFor(progress, p.id).percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <RecentProjects title="Recent project updates" projects={recentlyUpdated(projects, 6)} progress={progress} />
      </div>
    </>
  )
}
