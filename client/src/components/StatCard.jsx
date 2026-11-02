import { motion } from 'motion/react'
import { Link } from 'react-router'
import Icon from './Icon.jsx'

const TONES = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  slate: 'bg-slate-100 text-slate-500 ring-slate-200',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
}

// Statistic tile: label, big number, icon and an optional hint line.
// Values always come from API data computed by the caller.
export default function StatCard({ label, value, icon, tone = 'brand', hint, to, index = 0 }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${TONES[tone]}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-2 truncate text-xs text-slate-500">{hint}</p>}
    </>
  )
  const classes =
    'block h-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {to ? (
        <Link to={to} className={classes}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </motion.div>
  )
}
