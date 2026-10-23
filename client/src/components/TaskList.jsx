import { Link } from 'react-router'
import { formatDueDate, isOverdue } from '../utils/labels.js'
import { Avatar, PriorityBadge, TaskStatusBadge } from './Badges.jsx'
import Icon from './Icon.jsx'

// Rows of tasks linking to /tasks/:id. `showProject` adds the project name
// (used on the dashboard, where tasks come from several projects).
export default function TaskList({ tasks, showProject = false }) {
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => {
        const overdue = isOverdue(task)
        return (
          <li key={task.id}>
            <Link to={`/tasks/${task.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-slate-50">
              <div className="min-w-0 flex-1 basis-48">
                <p className={`truncate text-sm font-medium ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {task.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                  {showProject && <span className="truncate">{task.project.name}</span>}
                  <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-red-600' : ''}`}>
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    {task.dueDate ? `${overdue ? 'Overdue · ' : ''}${formatDueDate(task.dueDate)}` : 'No due date'}
                  </span>
                  {task.commentCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="comment" className="h-3.5 w-3.5" />
                      {task.commentCount}
                    </span>
                  )}
                </p>
              </div>
              <span className="flex items-center gap-2">
                {task.assignee ? (
                  <span className="flex items-center gap-1.5 text-xs text-slate-600" title={task.assignee.email}>
                    <Avatar name={task.assignee.name} id={task.assignee.id} size="sm" />
                    <span className="hidden sm:inline">{task.assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-xs italic text-slate-400">Unassigned</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
