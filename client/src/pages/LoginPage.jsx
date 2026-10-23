import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import AccountPicker from '../components/AccountPicker.jsx'
import Button from '../components/Button.jsx'
import { Alert, Spinner } from '../components/Feedback.jsx'
import FormField, { inputClass } from '../components/FormField.jsx'
import RoleSelector from '../components/RoleSelector.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { getErrorCode, getErrorMessage, getFieldErrors } from '../services/api.js'
import { listDemoAccounts } from '../services/auth.js'
import { accountsForRole, firstAccountPerRole } from '../utils/accountSearch.js'
import { validateLoginForm } from '../utils/authForm.js'
import { ROLE_LABELS } from '../utils/labels.js'

// Demo password panel, shown ONLY in development (`npm run dev`).
// import.meta.env.DEV is the constant `false` in production builds, so the
// bundler drops this whole panel (and the demo password) from them.
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV
// Quick picks used if the live account list cannot be loaded.
const FALLBACK_DEMO_ACCOUNTS = [
  { role: 'ADMIN', email: 'admin@neostats.local' },
  { role: 'PROJECT_MANAGER', email: 'priya.pm@neostats.local' },
  { role: 'TEAM_MEMBER', email: 'aisha@neostats.local' },
  { role: 'VIEWER', email: 'viewer@neostats.local' },
]

export default function LoginPage() {
  const { status, login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // `role` only filters the account list. It is never sent to the server:
  // the server authenticates the email + password and reads the real role
  // from the database.
  const [role, setRole] = useState('')
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Active accounts for the picker (development only). data === null means the
  // server does not offer the list (production): fall back to typing an email.
  const accounts = useApi(() => listDemoAccounts(), [])
  const usePicker = Array.isArray(accounts.data)

  if (status === 'loading') return <Spinner label="Checking your session…" />
  // Already signed in: go to the app.
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const setEmail = (email) => setValues((v) => ({ ...v, email }))
  // A new role clears the chosen account, so it always belongs to that role.
  function chooseRole(next) {
    setRole(next)
    setValues((v) => ({ ...v, email: '' }))
    setErrors((e) => ({ ...e, role: undefined, email: undefined }))
  }
  const setPassword = (event) => setValues((v) => ({ ...v, password: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateLoginForm(values)
    if (usePicker && !role) found.role = 'Choose a role.'
    if (usePicker && found.email) found.email = role ? 'Choose an account.' : 'Choose a role first, then an account.'
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      // Only email + password are sent; the server decides the role.
      await login(values.email.trim(), values.password)
      // Back to the page the user originally asked for (same-app paths only).
      const from = location.state?.from?.pathname
      navigate(from && from.startsWith('/') && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (err) {
      setErrors(getFieldErrors(err))
      setFormError(getErrorMessage(err))
      if (getErrorCode(err) === 'ACCOUNT_DEACTIVATED') {
        // Deactivated since the list was loaded: clear it and refresh the list.
        setValues({ email: '', password: '' }) // role stays selected
        accounts.reload()
      } else {
        setValues((v) => ({ ...v, password: '' }))
      }
      setSubmitting(false)
    }
  }

  const roleLabel = ROLE_LABELS[role]
  const roleAccounts = usePicker ? accountsForRole(accounts.data, role) : []
  const showRoles = usePicker || (accounts.loading && !accounts.data)

  // Demo shortcuts follow the selected role: every account of that role, or
  // one per role when no role is chosen yet.
  const demoSource = usePicker && accounts.data.length > 0 ? accounts.data : FALLBACK_DEMO_ACCOUNTS
  const quickPicks = role ? accountsForRole(demoSource, role) : firstAccountPerRole(demoSource)

  function accountHint() {
    if (!role) return 'Choose a role above to see its accounts.'
    if (roleAccounts.length === 0) return `No active ${roleLabel} accounts. Run npm run db:seed or ask an administrator.`
    const count = `${roleAccounts.length} ${roleLabel} account${roleAccounts.length === 1 ? '' : 's'}`
    return `${count}. Click to open the list, then type to search by name or email.`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-base font-bold text-white">N</span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">NEOSTATS</span>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Use the account your administrator gave you.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            {notice && !formError && <Alert type="info">{notice}</Alert>}
            {formError && <Alert>{formError}</Alert>}
            {accounts.error && (
              <Alert type="warning" onRetry={accounts.reload}>
                Could not load the account list ({accounts.error}). You can type your email instead.
              </Alert>
            )}

            {showRoles && (
              <div>
                <p id="role-label" className="block text-sm font-medium text-slate-700">
                  Role
                </p>
                <div className="mt-1.5">
                  <RoleSelector labelId="role-label" value={role} onChange={chooseRole} invalid={Boolean(errors.role)} />
                </div>
                {errors.role && <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>}
              </div>
            )}

            {accounts.loading && !accounts.data ? (
              <FormField label="Account" htmlFor="email">
                <input id="email" disabled placeholder="Loading accounts…" className={inputClass(false)} />
              </FormField>
            ) : usePicker ? (
              <FormField
                label="Account"
                htmlFor="email"
                error={errors.email}
                hint={accounts.data.length === 0 ? 'No active accounts yet. Run npm run db:seed.' : accountHint()}
              >
                <AccountPicker
                  // Remount on role change so the search text and highlight reset too.
                  key={role}
                  id="email"
                  accounts={roleAccounts}
                  value={values.email}
                  onChange={setEmail}
                  invalid={Boolean(errors.email)}
                  disabled={!role}
                  placeholder={role ? `Search ${roleLabel} accounts by name or email…` : 'Choose a role first'}
                  emptyMessage={`No active ${roleLabel} accounts.`}
                />
              </FormField>
            ) : (
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={values.email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass(Boolean(errors.email))}
                />
              </FormField>
            )}

            <FormField label="Password" htmlFor="password" error={errors.password}>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={setPassword}
                className={inputClass(Boolean(errors.password))}
              />
            </FormField>

            <Button type="submit" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        {SHOW_DEMO_ACCOUNTS && (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">Development demo accounts</p>
            <p className="mt-1">
              Default password <code className="rounded bg-amber-100 px-1">Neostats@123</code> (see README).{' '}
              {role ? `${roleLabel} accounts, click to fill:` : 'Click to fill (also selects the role):'}
            </p>
            <ul className="mt-2 space-y-1">
              {quickPicks.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-amber-700"
                    onClick={() => {
                      setRole(account.role)
                      setValues({ email: account.email, password: '' })
                      setErrors({})
                    }}
                  >
                    {ROLE_LABELS[account.role]}: {account.email}
                  </button>
                </li>
              ))}
            </ul>
            {quickPicks.length === 0 && <p className="mt-2">No {roleLabel} demo accounts. Run npm run db:seed.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
