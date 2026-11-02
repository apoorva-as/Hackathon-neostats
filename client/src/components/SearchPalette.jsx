import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '../services/api.js'
import { listProjects } from '../services/projects.js'
import { listTasks } from '../services/tasks.js'
import { StatusBadge, TaskStatusBadge } from './Badges.jsx'
import Icon from './Icon.jsx'

// Quick search over projects and tasks (Ctrl/⌘ + K). Uses the existing
// `search` filter of GET /projects and GET /tasks, so results follow the
// same role-based visibility as everywhere else.
export default function SearchPalette({ open, onClose }) {
  return createPortal(<AnimatePresence>{open && <Palette onClose={onClose} />}</AnimatePresence>, document.body)
}

// Mounted only while open, so every opening starts with an empty search.
function Palette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ loading: false, error: null, projects: [], tasks: [] })
  const [active, setActive] = useState(0)

  // Debounced search.
  useEffect(() => {
    const term = query.trim()
    if (!term) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const [projects, tasks] = await Promise.all([listProjects({ search: term, limit: 5 }), listTasks({ search: term, limit: 6 })])
        if (!cancelled) setState({ loading: false, error: null, projects: projects.items, tasks: tasks.items })
        if (!cancelled) setActive(0)
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: getErrorMessage(err), projects: [], tasks: [] })
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const results = [
    ...state.projects.map((p) => ({ key: `p${p.id}`, to: `/projects/${p.id}`, kind: 'project', item: p })),
    ...state.tasks.map((t) => ({ key: `t${t.id}`, to: `/tasks/${t.id}`, kind: 'task', item: t })),
  ]

  function go(result) {
    onClose()
    navigate(result.to)
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') onClose()
    if (results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(results[active])
    }
  }

  const term = query.trim()

  return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <motion.button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Icon name="search" className="h-5 w-5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search projects and tasks…"
                aria-label="Search projects and tasks"
                className="h-14 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {state.loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />}
              <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">ESC</kbd>
            </div>

            <div className="scroll-thin max-h-[50vh] overflow-y-auto p-2">
              {!term && <p className="px-3 py-8 text-center text-sm text-slate-500">Type to search project names, task titles and descriptions.</p>}
              {state.error && <p className="px-3 py-6 text-center text-sm text-red-600">{state.error}</p>}
              {term && !state.loading && !state.error && results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-slate-500">No projects or tasks match “{term}”.</p>
              )}
              {results.map((result, index) => (
                <div key={result.key}>
                  {(index === 0 || results[index - 1].kind !== result.kind) && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {result.kind === 'project' ? 'Projects' : 'Tasks'}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(result)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${index === active ? 'bg-brand-50' : ''}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${result.kind === 'project' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon name={result.kind === 'project' ? 'folder' : 'tasks'} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{result.item.name ?? result.item.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {result.kind === 'project'
                          ? result.item.manager
                            ? `Managed by ${result.item.manager.name}`
                            : 'No manager'
                          : result.item.project.name}
                      </span>
                    </span>
                    {result.kind === 'project' ? <StatusBadge status={result.item.status} /> : <TaskStatusBadge status={result.item.status} />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
  )
}
