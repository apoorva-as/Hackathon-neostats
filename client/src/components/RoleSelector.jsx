import { ROLE_LABELS, ROLE_ORDER } from '../utils/labels.js'
import Icon from './Icon.jsx'

const ROLE_ICONS = {
  ADMIN: 'shield',
  PROJECT_MANAGER: 'folder',
  TEAM_MEMBER: 'users',
  VIEWER: 'eye',
}

// Four role cards for the login page. Choosing a role only FILTERS the account
// list: the role is never sent to the server, which reads it from the database.
export default function RoleSelector({ value, onChange, invalid = false, labelId }) {
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-2 gap-2">
      {ROLE_ORDER.map((role) => {
        const selected = role === value
        return (
          <button
            key={role}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(role)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              selected
                ? 'bg-indigo-50 text-indigo-700 ring-indigo-500'
                : `bg-white text-slate-700 hover:bg-slate-50 ${invalid ? 'ring-red-300' : 'ring-slate-200'}`
            }`}
          >
            <Icon name={ROLE_ICONS[role]} className={`h-4 w-4 shrink-0 ${selected ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="truncate">{ROLE_LABELS[role]}</span>
          </button>
        )
      })}
    </div>
  )
}
