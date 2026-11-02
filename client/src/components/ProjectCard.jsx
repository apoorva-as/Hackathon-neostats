import { motion } from 'motion/react'
import { Link } from 'react-router'
import { formatDate } from '../utils/labels.js'
import { Avatar, AvatarStack, StatusBadge } from './Badges.jsx'
import Icon from './Icon.jsx'
import { ProgressBar } from './ProgressBar.jsx'

const ACCENTS = ['from-brand-500 to-violet-500', 'from-sky-500 to-brand-500', 'from-teal-500 to-emerald-500', 'from-amber-500 to-rose-500', 'from-violet-500 to-fuchsia-500']

// Grid card for one project. `progress` = { total, done, percent, overdue }
// computed from the project's tasks; `contributors` = task assignees.
export default function ProjectCard({ project, progress, contributors = [], index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        to={`/projects/${project.id}`}
        className="group flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENTS[project.id % ACCENTS.length]} text-sm font-bold text-white shadow-sm`}>
            {project.name.slice(0, 1).toUpperCase()}
          </span>
          <StatusBadge status={project.status} />
        </div>

        <h3 className="mt-4 line-clamp-1 text-[15px] font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{project.description || 'No description.'}</p>

        <div className="mb-5 mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {progress.total > 0 ? `${progress.done} of ${progress.total} tasks done` : 'No tasks yet'}
              {progress.overdue > 0 && <span className="text-red-600"> · {progress.overdue} overdue</span>}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} className="mt-1.5 h-1.5" label={`${project.name} progress`} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {project.manager ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={project.manager.name} id={project.manager.id} size="xs" title={`Manager: ${project.manager.name}`} />
              <span className="truncate text-xs text-slate-600">{project.manager.name}</span>
            </span>
          ) : (
            <span className="text-xs italic text-slate-400">No manager</span>
          )}
          <span className="flex shrink-0 items-center gap-2">
            {contributors.length > 0 && <AvatarStack people={contributors} max={3} />}
            <span className="flex items-center gap-1 text-xs text-slate-500" title="Team members">
              <Icon name="users" className="h-3.5 w-3.5" />
              {project.memberCount}
            </span>
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
          <Icon name="calendar" className="h-3 w-3" /> Started {formatDate(project.createdAt)}
        </p>
      </Link>
    </motion.div>
  )
}
