import { motion } from 'motion/react'

// Horizontal progress bar (0–100). Animates its width on mount.
export function ProgressBar({ value, className = 'h-1.5', tone = 'bg-brand-500', label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={`h-full rounded-full ${tone}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

// Stacked bar of several segments, e.g. projects by status.
// segments = [{ key, label, value, color }]
export function SegmentedBar({ segments, className = 'h-2.5' }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className={`flex w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <motion.div
              key={s.key}
              className={`h-full ${s.color}`}
              title={`${s.label}: ${s.value}`}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
    </div>
  )
}

// Circular progress ring with the percentage in the middle.
export function ProgressRing({ value, size = 56, stroke = 6 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-slate-100" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none stroke-brand-500"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-slate-900">{pct}%</span>
    </div>
  )
}
