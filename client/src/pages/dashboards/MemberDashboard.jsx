import { useState } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/Badges.jsx'
import Button from '../../components/Button.jsx'
import { DashboardSkeleton, Greeting, QuickActions, TaskRows, ViewAllLink } from '../../components/dashboard/Widgets.jsx'
import Icon from '../../components/Icon.jsx'
import { Alert } from '../../components/Feedback.jsx'
import { Card } from '../../components/PageHeader.jsx'
import { ProgressBar } from '../../components/ProgressBar.jsx'
import StatCard from '../../components/StatCard.jsx'
import TaskQuickView from '../../components/TaskQuickView.jsx'
import { useWorkspaceData } from '../../hooks/useWorkspaceData.js'
import { priorityTasks, progressByProject, progressFor, recentlyUpdated, taskStatusCounts, upcomingTasks } from '../../utils/workspaceStats.js'

// Team Member: centred on the tasks assigned to them (assigneeId = self).
export default function MemberDashboard({ user }) {
  const { data, loading, error, reload } = useWorkspaceData({ assigneeId: user.id }, [user.id])
  const [openTaskId, setOpenTaskId] = useState(null)

  const greeting = (
    <Greeting
      role={user.role}
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      description="Let's make today productive."
      actions={
        <Button to="/tasks" icon="board">
          My task board
        </Button>
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
        <DashboardSkeleton />
      </>
    )
  }

  const { projects, tasks } = data
  const counts = taskStatusCounts(tasks)
  const open = tasks.filter((t) => t.status !== 'DONE')
  const mine = progressByProject(tasks)
  const completion = counts.total === 0 ? 0 : Math.round((counts.DONE / counts.total) * 100)

  return (
    <>
      {greeting}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Assigned tasks" value={counts.total} icon="tasks" tone="brand" hint={`${completion}% completed`} to="/tasks" />
        <StatCard index={1} label="To do" value={counts.TODO} icon="todo" tone="slate" hint="Not started yet" />
        <StatCard index={2} label="In progress" value={counts.IN_PROGRESS} icon="zap" tone="sky" hint="Currently working on" />
        <StatCard index={3} label="Completed" value={counts.DONE} icon="check-circle" tone="emerald" hint={counts.overdue > 0 ? `${counts.overdue} overdue` : 'Nothing overdue'} />
      </div>

      <div className="mt-6">
        <QuickActions
          actions={[
            { icon: 'tasks', label: 'View my tasks', text: 'Everything assigned to you', to: '/tasks' },
            { icon: 'board', label: 'Update task status', text: 'Drag cards on your board', to: '/tasks' },
            { icon: 'projects', label: 'View projects', text: 'Projects you belong to', to: '/projects' },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`My tasks · ${open.length} open`} icon="tasks" padded={false} actions={<ViewAllLink to="/tasks" />}>
            <TaskRows tasks={open} limit={8} emptyText="Nothing assigned to you right now." onOpen={(t) => setOpenTaskId(t.id)} meta="status" />
          </Card>
        </div>
        <Card title="Upcoming deadlines" icon="calendar" subtitle="Next 14 days" padded={false}>
          <TaskRows tasks={upcomingTasks(tasks, undefined, 14)} emptyIcon="calendar" emptyText="No deadlines coming up." onOpen={(t) => setOpenTaskId(t.id)} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Priority tasks" icon="flag" subtitle="Open high-priority work" padded={false}>
          <TaskRows tasks={priorityTasks(tasks)} emptyText="No high-priority tasks open." onOpen={(t) => setOpenTaskId(t.id)} />
        </Card>
        <Card title="Recently updated" icon="activity" padded={false}>
          <TaskRows tasks={recentlyUpdated(tasks, 6)} emptyText="No task updates yet." onOpen={(t) => setOpenTaskId(t.id)} meta="updated" />
        </Card>
        <Card title={`Assigned projects · ${projects.length}`} icon="projects" padded={false} actions={<ViewAllLink to="/projects" />}>
          {projects.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">You have not been added to any project yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.slice(0, 6).map((project) => {
                const p = progressFor(mine, project.id)
                return (
                  <li key={project.id}>
                    <Link to={`/projects/${project.id}`} className="group block px-5 py-3 transition-colors hover:bg-slate-50/80">
                      <div className="flex items-center gap-2">
                        <Icon name="folder" className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 group-hover:text-brand-700">{project.name}</span>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-3 pl-6">
                        <ProgressBar value={p.percent} label={`My progress on ${project.name}`} />
                        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                          {p.done}/{p.total} mine
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <TaskQuickView taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={reload} />
    </>
  )
}
