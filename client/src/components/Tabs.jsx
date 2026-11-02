import { motion } from 'motion/react'
import { useId } from 'react'
import Icon from './Icon.jsx'

// Underlined tab bar with an animated active indicator.
// tabs = [{ value, label, icon?, count? }]
export function Tabs({ tabs, value, onChange, className = '' }) {
  const id = useId()
  return (
    <div className={`scroll-thin -mx-1 overflow-x-auto border-b border-slate-200 ${className}`}>
      <div role="tablist" className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => {
          const active = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={`relative flex items-center gap-2 px-3 pb-2.5 pt-1.5 text-sm font-medium transition-colors ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab.icon && <Icon name={tab.icon} className="h-4 w-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId={`tab-indicator-${id}`}
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Compact pill toggle (e.g. Grid / List view, Board / List).
// options = [{ value, label, icon? }]
export function SegmentedControl({ options, value, onChange, label }) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-slate-200"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon && <Icon name={option.icon} className="h-4 w-4" />}
              <span className={option.icon ? 'hidden sm:inline' : ''}>{option.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
