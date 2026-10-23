import { useId, useState } from 'react'
import { filterAccounts } from '../utils/accountSearch.js'
import { Avatar, RoleBadge } from './Badges.jsx'
import { inputClass } from './FormField.jsx'

// Searchable account dropdown (ARIA combobox, no extra library).
// The list opens only when the user clicks the field, types, or presses
// Arrow Down (never on page load or plain Tab focus). Type to filter by name
// or email; pick with the mouse or with Arrow keys + Enter; Esc closes.
// `value` is the chosen email and `onChange(email)` reports a choice. Picking
// an account only fills the email: the server still checks the password and
// decides the role.
export default function AccountPicker({
  id,
  accounts,
  value,
  onChange,
  invalid = false,
  disabled = false,
  placeholder = 'Search by name or email…',
  emptyMessage = 'No active accounts found.',
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selected = accounts.find((account) => account.email === value) ?? null
  const matches = filterAccounts(accounts, query)

  function openList() {
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  function choose(account) {
    onChange(account.email)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return openList()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (matches.length === 0 ? 0 : (i + step + matches.length) % matches.length))
    } else if (event.key === 'Enter' && open) {
      // Choose the highlighted account instead of submitting the form.
      event.preventDefault()
      if (matches[active]) choose(matches[active])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  // While closed, the input shows the chosen account; while open, the search text.
  const shown = open ? query : selected ? `${selected.name} (${selected.email})` : ''
  const activeId = open && matches[active] ? `${listId}-${matches[active].id}` : undefined

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={shown}
        onClick={() => {
          if (!open) openList()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={`${inputClass(invalid)} pr-8`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400" aria-hidden="true">
        ▾
      </span>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {accounts.length === 0 ? emptyMessage : `No account matches “${query.trim()}”.`}
            </li>
          )}
          {matches.map((account, index) => (
            <li
              key={account.id}
              id={`${listId}-${account.id}`}
              role="option"
              aria-selected={account.email === value}
              // mousedown (not click) so the choice happens before the input blurs
              onMouseDown={(event) => {
                event.preventDefault()
                choose(account)
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${index === active ? 'bg-indigo-50' : ''}`}
            >
              <Avatar name={account.name} id={account.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{account.name}</p>
                <p className="truncate text-xs text-slate-500">{account.email}</p>
              </div>
              <RoleBadge role={account.role} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
