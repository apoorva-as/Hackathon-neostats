import { Link } from 'react-router'
import Icon from './Icon.jsx'

const VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  'ghost-danger': 'text-red-600 hover:bg-red-50',
}
const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1',
  md: 'px-3.5 py-2 text-sm gap-1.5',
}

// Button, or a Link styled as a button when `to` is given.
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  to,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = `inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
}
