import { Link } from 'react-router'
import Icon from './Icon.jsx'

export default function PageHeader({ title, description, back, actions, children, eyebrow }) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="group mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <Icon name="left" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {children}
          </div>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

// Content card. `hover` adds the lift-on-hover effect used by clickable cards.
export function Card({ title, icon, actions, children, className = '', padded = true, subtitle }) {
  return (
    <section className={`rounded-xl border border-slate-200/80 bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-400" />}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}
