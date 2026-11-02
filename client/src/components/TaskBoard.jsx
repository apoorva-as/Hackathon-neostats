import { motion } from 'motion/react'
import { useState } from 'react'
import { formatDueDate, isOverdue, TASK_STATUSES, TASK_STATUS_LABELS } from '../utils/labels.js'
import { groupByStatus } from '../utils/workspaceStats.js'
import { TASK_STATUS_DOTS } from '../utils/statusColors.js'
import { Avatar, PriorityBadge } from './Badges.jsx'
import Icon from './Icon.jsx'

const PRIORITY_EDGE = { HIGH: 'before:bg-red-500', MEDIUM: 'before:bg-amber-400', LOW: 'before:bg-slate-300' }

// One task card on the board / in grids.
export function TaskCard({ task, showProject = true, draggable = false, saving = false, onOpen, onDragStart, onDragEnd }) {
  const overdue = isOverdue(task)
  return (
    <motion.div
      layout="position"
      layoutId={`task-${task.id}`}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      <div
        role="button"
        tabIndex={0}
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', String(task.id))
          event.dataTransfer.effectAllowed = 'move'
          onDragStart?.(task)
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={() => onOpen?.(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen?.(task)
          }
        }}
        aria-label={`Open task ${task.title}`}
        className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 pl-3.5 shadow-card transition-all duration-150 before:absolute before:inset-y-0 before:left-0 before:w-[3px] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-brand-500 ${PRIORITY_EDGE[task.priority] ?? ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${saving ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          {showProject && <p className="truncate text-[11px] font-medium text-slate-400">{task.project?.name}</p>}
          {draggable && <Icon name="grip" className="ml-auto h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />}
        </div>
        <p className={`mt-0.5 text-sm font-medium leading-snug ${task.status === 'DONE' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
          {task.title}
        </p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}
        <div className="mt-3 flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <span className={`inline-flex items-center gap-1 text-[11px] ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {task.dueDate ? formatDueDate(task.dueDate) : 'No date'}
          </span>
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Icon name="comment" className="h-3.5 w-3.5" />
              {task.commentCount}
            </span>
          )}
          <span className="ml-auto">
            {task.assignee ? (
              <Avatar name={task.assignee.name} id={task.assignee.id} size="xs" title={task.assignee.name} />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300" title="Unassigned">
                <Icon name="user" className="h-3 w-3" />
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

const COLUMN_STYLE = {
  TODO: 'from-slate-100/80',
  IN_PROGRESS: 'from-brand-50',
  DONE: 'from-emerald-50/80',
}

// Kanban board: To do / In progress / Done (the statuses the API supports).
// Cards are draggable only when canDrag(task) is true (UX hint; the API
// re-checks every change). Columns scroll horizontally on small screens.
export default function TaskBoard({ tasks, canDrag = () => false, onMove, onOpen, showProject = true, savingId }) {
  const groups = groupByStatus(tasks)
  const [dragged, setDragged] = useState(null)
  const [overColumn, setOverColumn] = useState(null)

  function drop(status) {
    if (dragged && dragged.status !== status) onMove?.(dragged, status)
    setDragged(null)
    setOverColumn(null)
  }

  return (
    <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[760px] grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const list = groups[status]
          const isTarget = dragged && dragged.status !== status
          return (
            <section
              key={status}
              aria-label={`${TASK_STATUS_LABELS[status]} column`}
              onDragOver={(event) => {
                if (!isTarget) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOverColumn(status)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOverColumn(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                drop(status)
              }}
              className={`flex min-h-[320px] flex-col rounded-xl bg-gradient-to-b ${COLUMN_STYLE[status]} to-slate-50/40 p-2.5 ring-1 transition-all duration-150 ${overColumn === status ? 'ring-2 ring-brand-400 ring-offset-2' : isTarget ? 'ring-brand-200' : 'ring-slate-200/70'}`}
            >
              <header className="mb-2.5 flex items-center gap-2 px-1.5 pt-1">
                <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOTS[status]}`} />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{TASK_STATUS_LABELS[status]}</h3>
                <span className="rounded-full bg-white px-1.5 text-[11px] font-medium tabular-nums text-slate-500 ring-1 ring-slate-200">{list.length}</span>
              </header>
              <div className="scroll-thin flex max-h-[68vh] flex-1 flex-col gap-2 overflow-y-auto p-0.5">
                {list.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showProject={showProject}
                    draggable={canDrag(task)}
                    saving={savingId === task.id}
                    onOpen={onOpen}
                    onDragStart={setDragged}
                    onDragEnd={() => {
                      setDragged(null)
                      setOverColumn(null)
                    }}
                  />
                ))}
                {list.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                    {isTarget ? 'Drop here' : 'No tasks'}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
