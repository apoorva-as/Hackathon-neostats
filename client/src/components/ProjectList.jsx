import { Link } from 'react-router'
import { formatDate } from '../utils/labels.js'
import { progressFor } from '../utils/workspaceStats.js'
import { Avatar, StatusBadge } from './Badges.jsx'
import Icon from './Icon.jsx'
import { ProgressBar } from './ProgressBar.jsx'

function ManagerCell({ manager }) {
  if (!manager) return <span className="text-sm italic text-slate-400">Unassigned</span>
  return (
    <span className="flex items-center gap-2">
      <Avatar name={manager.name} id={manager.id} size="xs" />
      <span className="truncate text-sm text-slate-700">{manager.name}</span>
    </span>
  )
}

// Table on larger screens, stacked cards on phones. `progress` (optional) is
// the map from progressByProject() so each row can show its completion.
export default function ProjectList({ projects, progress }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr className="text-left text-xs font-medium text-slate-500">
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Manager</th>
              {progress && <th className="w-44 px-5 py-3 font-medium">Progress</th>}
              <th className="px-5 py-3 text-right font-medium">Members</th>
              <th className="px-5 py-3 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project) => {
              const p = progress ? progressFor(progress, project.id) : null
              return (
                <tr key={project.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="max-w-sm px-5 py-3.5">
                    <Link to={`/projects/${project.id}`} className="font-medium text-slate-900 group-hover:text-brand-700">
                      {project.name}
                    </Link>
                    {project.description && <p className="mt-0.5 truncate text-sm text-slate-500">{project.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <ManagerCell manager={project.manager} />
                  </td>
                  {p && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={p.percent} label={`${project.name} progress`} />
                        <span className="w-9 text-right text-xs font-medium tabular-nums text-slate-600">{p.percent}%</span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right text-sm tabular-nums text-slate-700">{project.memberCount}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm text-slate-500">{formatDate(project.updatedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {projects.map((project) => {
          const p = progress ? progressFor(progress, project.id) : null
          return (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="block rounded-xl border border-slate-200/80 bg-white p-4 shadow-card active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <StatusBadge status={project.status} />
                </div>
                {project.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
                {p && (
                  <div className="mt-3 flex items-center gap-2">
                    <ProgressBar value={p.percent} label={`${project.name} progress`} />
                    <span className="text-xs font-medium tabular-nums text-slate-600">{p.percent}%</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <ManagerCell manager={project.manager} />
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Icon name="users" className="h-4 w-4" />
                    {project.memberCount}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
