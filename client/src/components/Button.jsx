import { Link } from 'react-router'
import Icon from './Icon.jsx'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50 hover:ring-slate-300',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  'ghost-danger': 'text-red-600 hover:bg-red-50',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
  white: 'bg-white text-brand-700 shadow-sm hover:bg-brand-50',
}
const SIZES = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
}
const ICON_SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-[18px] w-[18px]' }

// Button, or a Link styled as a button when `to` is given.
// `iconRight` places the icon after the label (e.g. an arrow on CTAs).
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  to,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = `group/btn inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading ? (
        <span className={`${ICON_SIZES[size]} animate-spin rounded-full border-2 border-current border-t-transparent`} />
      ) : (
        icon && <Icon name={icon} className={ICON_SIZES[size]} />
      )}
      {children}
      {iconRight && (
        <Icon name={iconRight} className={`${ICON_SIZES[size]} transition-transform duration-150 group-hover/btn:translate-x-0.5`} />
      )}
    </>
  )

  // Plain anchor for same-page links (e.g. "#product" on the landing page).
  if (props.href) {
    return (
      <a className={classes} {...props}>
        {content}
      </a>
    )
  }
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
}
