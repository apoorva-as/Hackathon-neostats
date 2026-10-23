import { useNavigate } from 'react-router'
import { useDevUser } from '../context/DevUserContext.jsx'
import { ROLE_LABELS, ROLE_ORDER } from '../utils/labels.js'

// TEMPORARY (Phase 1): pick which seeded user to view the app as.
// This is NOT a login. Phase 3 replaces it with real authentication.
export default function DevUserSwitcher() {
  const { users, currentUser, selectUser } = useDevUser()
  const navigate = useNavigate()

  function handleChange(event) {
    selectUser(event.target.value)
    // The new user may not be allowed on the current page.
    navigate('/dashboard')
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-medium text-slate-500 md:inline">Viewing as</span>
      <select
        value={currentUser?.id ?? ''}
        onChange={handleChange}
        aria-label="Development user (temporary, not authentication)"
        className="max-w-[13rem] rounded-lg border-0 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
      >
        {ROLE_ORDER.map((role) => {
          const group = users.filter((u) => u.role === role)
          if (group.length === 0) return null
          return (
            <optgroup key={role} label={ROLE_LABELS[role]}>
              {group.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </label>
  )
}
