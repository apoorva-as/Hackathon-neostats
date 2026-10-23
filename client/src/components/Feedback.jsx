import Button from './Button.jsx'
import Icon from './Icon.jsx'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      {label}
    </div>
  )
}

const ALERT_STYLES = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
}
const ALERT_ICONS = { error: 'alert', success: 'check', info: 'alert', warning: 'alert' }

export function Alert({ type = 'error', children, onRetry, onDismiss }) {
  if (!children) return null
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${ALERT_STYLES[type]}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon name={ALERT_ICONS[type]} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
          Retry
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'folder', title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name={icon} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Shown when the selected development user's role may not use a page.
export function NotAllowed({ children = 'Your current role cannot access this page.' }) {
  return (
    <EmptyState icon="lock" title="Not available for this role" action={<Button to="/dashboard" variant="secondary">Back to dashboard</Button>}>
      {children}
    </EmptyState>
  )
}
