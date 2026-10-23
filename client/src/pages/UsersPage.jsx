import { useState } from 'react'
import { Avatar, RoleBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Alert, EmptyState, NotAllowed, Spinner } from '../components/Feedback.jsx'
import FormField, { inputClass } from '../components/FormField.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage, getFieldErrors } from '../services/api.js'
import { createUser, listUsers, updateUser } from '../services/users.js'
import { toUserPayload, validateUserForm } from '../utils/authForm.js'
import { ROLE_LABELS, ROLE_ORDER } from '../utils/labels.js'
import { canViewUsers } from '../utils/permissions.js'

const EMPTY_FORM = { name: '', email: '', role: 'TEAM_MEMBER', password: '' }

// Create a user, or edit one (`user` given). Password is optional when editing
// (empty = keep the current one; a new one signs the user out everywhere).
function UserForm({ user, isSelf, onSaved, onCancel }) {
  const isNew = !user
  const [values, setValues] = useState(user ? { ...user, password: '' } : EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateUserForm(values, { isNew })
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    const payload = toUserPayload(values, user)
    if (!isNew && Object.keys(payload).length === 0) return onCancel()

    setSaving(true)
    try {
      const saved = isNew ? await createUser(payload) : await updateUser(user.id, payload)
      onSaved(saved, isNew)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setFormError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Card title={isNew ? 'New user' : `Edit ${user.name}`} className="mb-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="user-name" error={errors.name} required>
            <input id="user-name" value={values.name} onChange={set('name')} className={inputClass(Boolean(errors.name))} />
          </FormField>
          <FormField label="Email" htmlFor="user-email" error={errors.email} required>
            <input
              id="user-email"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={set('email')}
              className={inputClass(Boolean(errors.email))}
            />
          </FormField>
          <FormField
            label="Role"
            htmlFor="user-role"
            error={errors.role}
            hint={isSelf ? 'You cannot change your own role.' : undefined}
            required
          >
            <select
              id="user-role"
              value={values.role}
              onChange={set('role')}
              disabled={isSelf}
              className={inputClass(Boolean(errors.role))}
            >
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={isNew ? 'Password' : 'New password'}
            htmlFor="user-password"
            error={errors.password}
            hint={isNew ? '8+ characters with a letter and a digit.' : 'Leave empty to keep the current password.'}
            required={isNew}
          >
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={set('password')}
              className={inputClass(Boolean(errors.password))}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isNew ? 'Create user' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// Admin user management. The API allows only Admins to create, edit and
// deactivate users; this page just offers those actions.
export default function UsersPage() {
  const { currentUser } = useAuth()
  const allowed = canViewUsers(currentUser)
  const [role, setRole] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | user
  const [toggling, setToggling] = useState(null) // user to (de)activate
  const [toggleState, setToggleState] = useState({ loading: false, error: null })
  const [message, setMessage] = useState(null)
  const { data, loading, error, reload } = useApi(
    () => (allowed ? listUsers(role ? { role } : {}) : Promise.resolve(null)),
    [allowed, role],
  )

  if (!allowed) return <NotAllowed>Only an Admin can manage users.</NotAllowed>

  function handleSaved(saved, isNew) {
    setEditing(null)
    setMessage(`${saved.name} was ${isNew ? 'created' : 'updated'}.`)
    reload()
  }

  async function confirmToggle() {
    setToggleState({ loading: true, error: null })
    try {
      const saved = await updateUser(toggling.id, { isActive: !toggling.isActive })
      setMessage(`${saved.name} was ${saved.isActive ? 'reactivated' : 'deactivated'}.`)
      setToggling(null)
      setToggleState({ loading: false, error: null })
      reload()
    } catch (err) {
      setToggleState({ loading: false, error: getErrorMessage(err) })
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, change roles, reset passwords and deactivate users. Deactivated users cannot sign in."
        actions={
          editing === null && (
            <Button icon="plus" onClick={() => { setMessage(null); setEditing('new') }}>
              New user
            </Button>
          )
        }
      />

      {message && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setMessage(null)}>{message}</Alert>
        </div>
      )}

      {editing !== null && (
        <UserForm
          key={editing === 'new' ? 'new' : editing.id}
          user={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && editing.id === currentUser.id}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

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
          {data.items.map((user) => {
            const isSelf = user.id === currentUser.id
            return (
              <li key={user.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 ${user.isActive ? '' : 'bg-slate-50'}`}>
                <Avatar name={user.name} id={user.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user.name}
                    {isSelf && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                {!user.isActive && <span className="text-xs font-medium text-slate-400">Deactivated</span>}
                <RoleBadge role={user.role} />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    onClick={() => { setMessage(null); setEditing(user) }}
                    aria-label={`Edit ${user.name}`}
                  >
                    Edit
                  </Button>
                  {!isSelf && (
                    <Button
                      variant={user.isActive ? 'ghost-danger' : 'ghost'}
                      size="sm"
                      onClick={() => { setMessage(null); setToggling(user) }}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Reactivate ${toggling?.name}?`}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={Boolean(toggling?.isActive)}
        loading={toggleState.loading}
        error={toggleState.error}
        onConfirm={confirmToggle}
        onCancel={() => {
          setToggling(null)
          setToggleState({ loading: false, error: null })
        }}
      >
        {toggling?.isActive
          ? 'They are signed out immediately and cannot sign in until reactivated. Their projects, tasks and comments are kept.'
          : 'They will be able to sign in again with their existing password.'}
      </ConfirmDialog>
    </>
  )
}
