import { useState } from 'react'
import { Avatar, RoleBadge } from '../components/Badges.jsx'
import { Alert, EmptyState, NotAllowed, Spinner } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useDevUser } from '../context/DevUserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listUsers } from '../services/users.js'
import { ROLE_LABELS, ROLE_ORDER } from '../utils/labels.js'
import { canViewUsers } from '../utils/permissions.js'

// Basic, read-only user directory for Admins. Creating, editing and
// deactivating users comes with authentication in Phase 3.
export default function UsersPage() {
  const { currentUser } = useDevUser()
  const allowed = canViewUsers(currentUser)
  const [role, setRole] = useState('')
  const { data, loading, error, reload } = useApi(
    () => (allowed ? listUsers(role ? { role } : {}) : Promise.resolve(null)),
    [allowed, role],
  )

  if (!allowed) return <NotAllowed>Only an Admin can view the user directory.</NotAllowed>

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can be assigned as a project manager or team member. User management arrives with login in Phase 3."
      />
      <div className="mb-4">
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role" className={`${inputClass(false)} sm:w-52`}>
          <option value="">All roles</option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert onRetry={reload}>{error}</Alert>}
      {loading && !data && <Spinner />}
      {data && data.items.length === 0 && <EmptyState icon="users" title="No users found" />}
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {data.items.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={user.name} id={user.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              {!user.isActive && <span className="text-xs font-medium text-slate-400">Deactivated</span>}
              <RoleBadge role={user.role} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
