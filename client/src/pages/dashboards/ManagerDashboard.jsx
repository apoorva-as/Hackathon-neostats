import { useState } from 'react'
import Button from '../../components/Button.jsx'
import { DashboardSkeleton, Greeting, ProjectProgressList, QuickActions, TaskRows, ViewAllLink, WorkloadList } from '../../components/dashboard/Widgets.jsx'
import Dropdown from '../../components/Dropdown.jsx'
import { Alert } from '../../components/Feedback.jsx'
import Icon from '../../components/Icon.jsx'
import { Card } from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import TaskQuickView from '../../components/TaskQuickView.jsx'
import { useWorkspaceData } from '../../hooks/useWorkspaceData.js'
import {
  attentionTasks,
  contributorsByProject,
  progressByProject,
  taskStatusCounts,
  upcomingTasks,
  workloadByAssignee,
} from '../../utils/workspaceStats.js'

// "Create task" needs a project: pick one of the manager's open projects.
function CreateTaskAction({ projects }) {
  const open = projects.filter((p) => p.status !== 'ARCHIVED')
  return (
    <Dropdown
      align="left"
      header={<p className="text-xs font-medium text-slate-500">Create a task in…</p>}
      items={open.length > 0 ? open.map((p) => ({ label: p.name, icon: 'folder', to: `/projects/${p.id}/tasks/new` })) : [{ label: 'No open projects', icon: 'folder' }]}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="group flex h-full w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Create task</span>
            <span className="block truncate text-xs text-slate-500">Add work to one of your projects</span>
          </span>
          <Icon name="chevron-down" className="ml-auto h-4 w-4 text-slate-300" />
        </button>
      )}
    />
  )
}

// Project Manager: only the projects they manage (the API returns nothing else).
export default function ManagerDashboard({ user }) {
  const { data, loading, error, reload } = useWorkspaceData()
  const [openTaskId, setOpenTaskId] = useState(null)

  const greeting = (
    <Greeting
      role={user.role}
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      description="Here's an overview of the projects you're managing."
      actions={
        <Button to="/tasks" variant="secondary" icon="board">
          Open task board
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
  const progress = progressByProject(tasks)
  const attention = attentionTasks(tasks)
  const upcoming = upcomingTasks(tasks, undefined, 14)
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length

  return (
    <>
      {greeting}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="My projects" value={projects.length} icon="projects" tone="brand" hint={`${activeProjects} active`} to="/projects" />
        <StatCard index={1} label="Active tasks" value={counts.open} icon="zap" tone="sky" hint={`${counts.IN_PROGRESS} in progress · ${counts.TODO} to do`} to="/tasks" />
        <StatCard index={2} label="Completed tasks" value={counts.DONE} icon="check-circle" tone="emerald" hint={`${counts.total} tasks in total`} />
        <StatCard index={3} label="Overdue tasks" value={counts.overdue} icon="clock" tone={counts.overdue > 0 ? 'red' : 'slate'} hint={counts.overdue > 0 ? 'Need attention' : 'All on schedule'} />
      </div>

      <div className="mt-6">
        <QuickActions
          actions={[
            { label: 'Create task', element: <CreateTaskAction projects={projects} /> },
            { icon: 'projects', label: 'View projects', text: 'Status, progress and details', to: '/projects' },
            { icon: 'users', label: 'Manage team', text: 'Add or remove project members', to: projects.length === 1 ? `/projects/${projects[0].id}?tab=team` : '/projects' },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectProgressList
            title="My projects"
            projects={projects}
            progress={progress}
            contributors={contributorsByProject(tasks)}
            emptyText="No projects are assigned to you yet. An Admin assigns project managers."
          />
        </div>
        <WorkloadList workload={workloadByAssignee(tasks)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Tasks requiring attention · ${attention.length}`} icon="alert" subtitle="Overdue or unassigned" padded={false} actions={<ViewAllLink to="/tasks" />}>
          <TaskRows tasks={attention} emptyText="Everything is assigned and on time." onOpen={(t) => setOpenTaskId(t.id)} />
        </Card>
        <Card title="Upcoming deadlines" icon="calendar" subtitle="Due in the next 14 days" padded={false}>
          <TaskRows tasks={upcoming} emptyIcon="calendar" emptyText="No deadlines in the next two weeks." onOpen={(t) => setOpenTaskId(t.id)} />
        </Card>
      </div>

      <TaskQuickView taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={reload} />
    </>
  )
}
