import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import AccountPicker from '../components/AccountPicker.jsx'
import AuthShell from '../components/AuthShell.jsx'
import Button from '../components/Button.jsx'
import { Alert, ScreenLoader } from '../components/Feedback.jsx'
import Icon from '../components/Icon.jsx'
import { BRAND } from '../components/Logo.jsx'
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
  const [showPassword, setShowPassword] = useState(false)

  // Active accounts for the picker (development only). data === null means the
  // server does not offer the list (production): fall back to typing an email.
  const accounts = useApi(() => listDemoAccounts(), [])
  const usePicker = Array.isArray(accounts.data)

  if (status === 'loading') return <ScreenLoader label="Checking your session…" />
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
    <AuthShell>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your workspace.</p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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
              Sign in as
            </p>
            <div className="mt-1.5">
              <RoleSelector labelId="role-label" value={role} onChange={chooseRole} invalid={Boolean(errors.role)} />
            </div>
            {errors.role && <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>}
          </div>
        )}

        {accounts.loading && !accounts.data ? (
          <FormField label="Account" htmlFor="email">
            <input id="email" disabled placeholder="Loading accounts…" className={`${inputClass(false)} h-11`} />
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
          <FormField label="Work email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@company.com"
              value={values.email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${inputClass(Boolean(errors.email))} h-11`}
            />
          </FormField>
        )}

        <FormField label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={setPassword}
              className={`${inputClass(Boolean(errors.password))} h-11 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} className="h-4 w-4" />
            </button>
          </div>
        </FormField>

        <Button type="submit" loading={submitting} size="lg" className="w-full" iconRight={submitting ? undefined : 'arrow'}>
          {submitting ? 'Signing in…' : `Sign in to ${BRAND.name}`}
        </Button>

        <p className="text-center text-xs text-slate-500">
          Forgot your password? Ask your workspace administrator to reset it.
        </p>
      </form>

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        New to {BRAND.name}?{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Request access
        </Link>
      </p>

      {SHOW_DEMO_ACCOUNTS && (
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <Icon name="key" className="h-3.5 w-3.5" /> Development demo accounts
          </p>
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
    </AuthShell>
  )
}
