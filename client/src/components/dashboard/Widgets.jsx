import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PROJECT_STATUSES, STATUS_LABELS, formatDate, isOverdue } from '../../utils/labels.js'
import { STATUS_DOTS } from '../../utils/statusColors.js'
import { progressFor, relativeDue } from '../../utils/workspaceStats.js'
import { Avatar, AvatarStack, PriorityBadge, RoleBadge, StatusBadge, TaskStatusBadge } from '../Badges.jsx'
import { EmptyState, SkeletonCards, SkeletonList } from '../Feedback.jsx'
import Icon from '../Icon.jsx'
import { Card } from '../PageHeader.jsx'
import { ProgressBar, ProgressRing, SegmentedBar } from '../ProgressBar.jsx'

// Building blocks shared by the four role dashboards. Every number shown is
// passed in by the dashboard, computed from API data (utils/workspaceStats.js).

export function Greeting({ title, description, actions, role }) {
  // Read the clock once when the greeting mounts.
  const [part] = useState(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  })
  return (
    <motion.div
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div>
        <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
          Good {part} {role && <RoleBadge role={role} />}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  )
}

export function DashboardSkeleton({ stats = 4 }) {
  return (
    <div className="space-y-6">
      <SkeletonCards count={stats} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <SkeletonList rows={5} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white">
          <SkeletonList rows={5} />
        </div>
      </div>
    </div>
  )
}

export function ViewAllLink({ to, label = 'View all' }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800">
      {label}
      <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

// Projects by status as a stacked bar with a legend, plus overall completion.
export function ProjectOverview({ counts, completion, taskTotal, title = 'Project overview' }) {
  const segments = PROJECT_STATUSES.map((status) => ({
    key: status,
    label: STATUS_LABELS[status],
    value: counts[status] ?? 0,
    color: STATUS_DOTS[status],
  }))
  return (
    <Card title={title} icon="activity" actions={<ViewAllLink to="/projects" />}>
      <div className="flex items-center gap-5">
        <ProgressRing value={completion} size={72} stroke={7} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{completion}% of tasks complete</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Across {counts.total} project{counts.total === 1 ? '' : 's'} and {taskTotal} task{taskTotal === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <SegmentedBar segments={segments} />
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${s.color}`} />
              <span className="text-slate-600">{s.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-slate-900">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

// List of projects with a progress bar each (progress = done tasks / tasks).
export function ProjectProgressList({ projects, progress, title = 'Project progress', emptyText, limit = 6, contributors }) {
  return (
    <Card title={title} icon="trend" padded={false} actions={<ViewAllLink to="/projects" />}>
      {projects.length === 0 ? (
        <div className="p-5">
          <EmptyState compact icon="folder" title="No projects to show">
            {emptyText}
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {projects.slice(0, limit).map((project) => {
            const p = progressFor(progress, project.id)
            return (
              <li key={project.id}>
                <Link to={`/projects/${project.id}`} className="group block px-5 py-3.5 transition-colors hover:bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                      <Icon name="folder" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 group-hover:text-brand-700">{project.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {project.manager ? project.manager.name : 'No manager'} · {p.done}/{p.total} tasks done
                        {p.overdue > 0 && <span className="text-red-600"> · {p.overdue} overdue</span>}
                      </p>
                    </div>
                    {contributors && <span className="hidden sm:block"><AvatarStack people={contributors.get(project.id) ?? []} max={3} /></span>}
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="mt-2.5 flex items-center gap-3 pl-11">
                    <ProgressBar value={p.percent} label={`${project.name} progress`} />
                    <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-700">{p.percent}%</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Compact task rows. `meta` chooses the right-hand detail.
export function TaskRows({ tasks, emptyIcon = 'check-circle', emptyText, onOpen, showProject = true, meta = 'due', limit = 6 }) {
  if (tasks.length === 0) {
    return <p className="flex items-center justify-center gap-2 px-5 py-10 text-center text-sm text-slate-500"><Icon name={emptyIcon} className="h-4 w-4 text-emerald-500" />{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.slice(0, limit).map((task) => {
        const overdue = isOverdue(task)
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onOpen?.(task)}
              className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/80"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-slate-300'}`} title={`${task.priority} priority`} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-brand-700'}`}>
                  {task.title}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {showProject && task.project?.name}
                  {showProject && task.reason && ' · '}
                  {task.reason && <span className={task.reason === 'Overdue' ? 'text-red-600' : 'text-amber-700'}>{task.reason}</span>}
                </span>
              </span>
              {meta === 'due' && (
                <span className={`hidden shrink-0 text-xs sm:block ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>{relativeDue(task.dueDate)}</span>
              )}
              {meta === 'status' && <TaskStatusBadge status={task.status} />}
              {meta === 'priority' && <PriorityBadge priority={task.priority} />}
              {meta === 'updated' && <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{formatDate(task.updatedAt)}</span>}
              {task.assignee ? (
                <Avatar name={task.assignee.name} id={task.assignee.id} size="xs" title={task.assignee.name} />
              ) : (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300" title="Unassigned">
                  <Icon name="user" className="h-3 w-3" />
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Per-person open work (from task assignees), with a bar per person.
export function WorkloadList({ workload, emptyText = 'No assigned tasks yet.' }) {
  const max = Math.max(1, ...workload.map((w) => w.open + w.done))
  return (
    <Card title="Team workload" icon="users" subtitle="Open and completed tasks per person">
      {workload.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-4">
          {workload.slice(0, 7).map((w) => (
            <li key={w.user.id} className="flex items-center gap-3">
              <Avatar name={w.user.name} id={w.user.id} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-800">{w.user.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{w.open}</span> open · {w.done} done
                    {w.overdue > 0 && <span className="text-red-600"> · {w.overdue} overdue</span>}
                  </span>
                </div>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${(w.inProgress / max) * 100}%` }} transition={{ duration: 0.6 }} title={`${w.inProgress} in progress`} />
                  <motion.div className="h-full bg-brand-300" initial={{ width: 0 }} animate={{ width: `${(w.todo / max) * 100}%` }} transition={{ duration: 0.6, delay: 0.05 }} title={`${w.todo} to do`} />
                  <motion.div className="h-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: `${(w.done / max) * 100}%` }} transition={{ duration: 0.6, delay: 0.1 }} title={`${w.done} done`} />
                </div>
              </div>
            </li>
          ))}
          <li className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-500" />In progress</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-300" />To do</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" />Done</span>
          </li>
        </ul>
      )}
    </Card>
  )
}

// Recently updated projects (by updatedAt).
export function RecentProjects({ projects, title = 'Recent projects', progress }) {
  return (
    <Card title={title} icon="clock" padded={false} actions={<ViewAllLink to="/projects" />}>
      {projects.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">No projects yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[p.status]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-brand-700">{p.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    Updated {formatDate(p.updatedAt)} · {p.memberCount} member{p.memberCount === 1 ? '' : 's'}
                    {progress && ` · ${progressFor(progress, p.id).percent}% done`}
                  </span>
                </span>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Shortcut tiles. actions = [{ icon, label, text, to } | { element }]
export function QuickActions({ actions }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {actions.map((action, i) => (
        <motion.div key={action.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
          {action.element ?? (
            <Link
              to={action.to}
              className="group flex h-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30 transition-transform group-hover:scale-105">
                <Icon name={action.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                <span className="block truncate text-xs text-slate-500">{action.text}</span>
              </span>
              <Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </Link>
          )}
        </motion.div>
      ))}
    </div>
  )
}
