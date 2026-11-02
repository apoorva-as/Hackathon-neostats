import { useState } from 'react'
import { Avatar } from '../../components/Badges.jsx'
import Button from '../../components/Button.jsx'
import { Greeting, DashboardSkeleton, ProjectOverview, RecentProjects, TaskRows, ViewAllLink } from '../../components/dashboard/Widgets.jsx'
import { Alert } from '../../components/Feedback.jsx'
import { Card } from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import TaskQuickView from '../../components/TaskQuickView.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useWorkspaceData } from '../../hooks/useWorkspaceData.js'
import { listUsers } from '../../services/users.js'
import {
  managersSummary,
  overallCompletion,
  overdueTasks,
  progressByProject,
  projectStatusCounts,
  recentlyUpdated,
  taskStatusCounts,
} from '../../utils/workspaceStats.js'

// Admin: organisation-wide overview (every project and task).
export default function AdminDashboard({ user }) {
  const { data, loading, error, reload } = useWorkspaceData()
  const managers = useApi(() => listUsers({ role: 'PROJECT_MANAGER', isActive: 'true' }), [])
  const [openTaskId, setOpenTaskId] = useState(null)

  const greeting = (
    <Greeting
      role={user.role}
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      description="Here's what's happening across your workspace."
      actions={
        <>
          <Button to="/users" variant="secondary" icon="user-plus">
            Manage users
          </Button>
          <Button to="/projects/new" icon="plus">
            New project
          </Button>
        </>
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
        <DashboardSkeleton stats={5} />
      </>
    )
  }

  const { projects, tasks } = data
  const counts = projectStatusCounts(projects)
  const taskCounts = taskStatusCounts(tasks)
  const progress = progressByProject(tasks)
  const open = tasks.filter((t) => t.status !== 'DONE')
  const overdue = overdueTasks(tasks)
  const recentTasks = recentlyUpdated(tasks, 6)

  return (
    <>
      {greeting}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard index={0} label="Total projects" value={counts.total} icon="projects" tone="brand" hint={`${taskCounts.total} tasks in total`} to="/projects" />
        <StatCard index={1} label="Active" value={counts.ACTIVE} icon="zap" tone="emerald" hint="In progress right now" />
        <StatCard index={2} label="On hold" value={counts.ON_HOLD} icon="pause" tone="amber" hint="Paused projects" />
        <StatCard index={3} label="Completed" value={counts.COMPLETED} icon="check-circle" tone="sky" hint="Delivered projects" />
        <StatCard index={4} label="Archived" value={counts.ARCHIVED} icon="archive" tone="slate" hint="Kept for history" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ProjectOverview counts={counts} completion={overallCompletion(tasks)} taskTotal={tasks.length} />
        <div className="lg:col-span-2">
          <RecentProjects projects={recentlyUpdated(projects, 5)} progress={progress} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={`Open tasks · ${open.length}`} icon="tasks" padded={false} actions={<ViewAllLink to="/tasks" />}>
          <TaskRows tasks={open} emptyText="No open tasks." onOpen={(t) => setOpenTaskId(t.id)} meta="status" />
        </Card>
        <Card title={`Overdue tasks · ${overdue.length}`} icon="clock" padded={false}>
          <TaskRows tasks={overdue} emptyText="Nothing is overdue." onOpen={(t) => setOpenTaskId(t.id)} />
        </Card>
        <Card title="Project managers" icon="users" padded={false} actions={<ViewAllLink to="/users" label="Users" />}>
          {managers.error && (
            <div className="p-4">
              <Alert onRetry={managers.reload}>{managers.error}</Alert>
            </div>
          )}
          {managers.data && managers.data.items.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No active project managers.</p>}
          {managers.data && (
            <ul className="divide-y divide-slate-100">
              {managersSummary(managers.data.items, projects)
                .slice(0, 6)
                .map(({ manager, projects: count, active }) => (
                  <li key={manager.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={manager.name} id={manager.id} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{manager.name}</span>
                      <span className="block truncate text-xs text-slate-500">{manager.email}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-slate-900">{count}</span>
                      <span className="block text-[11px] text-slate-500">{active} active</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recent activity" subtitle="Most recently updated tasks" icon="activity" padded={false} actions={<ViewAllLink to="/tasks" />}>
          <TaskRows tasks={recentTasks} emptyText="No task updates yet." onOpen={(t) => setOpenTaskId(t.id)} meta="updated" />
        </Card>
      </div>

      <TaskQuickView taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={reload} />
    </>
  )
}
