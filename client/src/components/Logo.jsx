import { useId } from 'react'

// WORKSPHERE brand mark: three connected workflow nodes inside a sphere ring.
export function LogoMark({ className = 'h-8 w-8' }) {
  // Unique gradient id per instance: a shared id breaks when the first copy
  // sits inside a hidden element (e.g. the desktop sidebar on mobile).
  const gradientId = `ws-mark-${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B6BFF" />
          <stop offset="1" stopColor="#4938E8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <circle cx="16" cy="16" r="8.5" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" />
      <path d="M10 12.5 16 19l6-6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="12.5" r="2.3" fill="#fff" />
      <circle cx="22" cy="12.5" r="2.3" fill="#fff" />
      <circle cx="16" cy="19" r="2.3" fill="#fff" />
    </svg>
  )
}

// Mark + wordmark. `tone="light"` for dark backgrounds.
export default function Logo({ tone = 'dark', showText = true, className = '', markClassName = 'h-8 w-8' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={`${markClassName} shrink-0`} />
      {showText && (
        <span className={`text-[15px] font-extrabold tracking-[0.14em] ${tone === 'light' ? 'text-white' : 'text-slate-900'}`}>
          WORKSPHERE
        </span>
      )}
    </span>
  )
}

// eslint-disable-next-line react/only-export-components
export const BRAND = {
  name: 'WORKSPHERE',
  tagline: 'One workspace. Every project. Complete clarity.',
}
