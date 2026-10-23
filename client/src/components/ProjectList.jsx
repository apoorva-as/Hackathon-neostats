import { Link } from 'react-router'
import { Avatar, StatusBadge } from './Badges.jsx'
import Icon from './Icon.jsx'
import { formatDate } from '../utils/labels.js'

function ManagerCell({ manager }) {
  if (!manager) return <span className="text-sm italic text-slate-400">Unassigned</span>
  return (
    <span className="flex items-center gap-2">
      <Avatar name={manager.name} id={manager.id} size="sm" />
      <span className="truncate text-sm text-slate-700">{manager.name}</span>
    </span>
  )
}

// Table on larger screens, stacked cards on phones.
export default function ProjectList({ projects }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Manager</th>
              <th className="px-5 py-3 text-right">Members</th>
              <th className="px-5 py-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project) => (
              <tr key={project.id} className="group hover:bg-slate-50">
                <td className="max-w-sm px-5 py-4">
                  <Link to={`/projects/${project.id}`} className="font-medium text-slate-900 group-hover:text-indigo-600">
                    {project.name}
                  </Link>
                  {project.description && <p className="mt-0.5 truncate text-sm text-slate-500">{project.description}</p>}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4">
                  <ManagerCell manager={project.manager} />
                </td>
                <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-700">{project.memberCount}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-500">{formatDate(project.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.id}`}
              className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">{project.name}</p>
                <StatusBadge status={project.status} />
              </div>
              {project.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <ManagerCell manager={project.manager} />
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Icon name="users" className="h-4 w-4" />
                  {project.memberCount}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
