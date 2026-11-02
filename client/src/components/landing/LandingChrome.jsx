import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../Button.jsx'
import Icon from '../Icon.jsx'
import Logo, { BRAND } from '../Logo.jsx'

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#solutions', label: 'Solutions' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#testimonials', label: 'Testimonials' },
]

// Sticky marketing navbar: transparent at the top, frosted white once scrolled.
export function LandingNav() {
  const { status } = useAuth()
  const signedIn = status === 'authenticated'
  // Set when a signed-out visitor was sent here from an app page: "Sign in"
  // forwards it so login returns them to that page.
  const returnTo = useLocation().state
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled || open ? 'border-b border-slate-200/70 bg-white/80 shadow-[0_1px_0_rgb(15_23_42/0.02)] backdrop-blur-lg' : 'border-b border-transparent bg-transparent'}`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Link to="/" aria-label={`${BRAND.name} home`} onClick={() => window.scrollTo({ top: 0 })}>
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-brand-500 after:transition-transform hover:text-slate-900 hover:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Button to="/dashboard" iconRight="arrow">
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button to="/login" state={returnTo} variant="ghost">
                Sign in
              </Button>
              <Button to="/signup" iconRight="arrow">
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'menu'} className="h-5 w-5" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="overflow-hidden border-t border-slate-100 bg-white md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="space-y-1 px-4 py-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </a>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {signedIn ? (
                  <Button to="/dashboard" className="col-span-2">
                    Go to dashboard
                  </Button>
                ) : (
                  <>
                    <Button to="/login" state={returnTo} variant="secondary">
                      Sign in
                    </Button>
                    <Button to="/signup">Get started</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const YEAR = new Date().getFullYear()

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Solutions', href: '/#solutions' },
      { label: 'How it works', href: '/#how-it-works' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Request access', to: '/signup' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {BRAND.tagline} Plan projects, organise tasks and keep every team aligned in one workspace.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-slate-900">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className="text-sm text-slate-500 transition-colors hover:text-brand-600">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="text-sm text-slate-500 transition-colors hover:text-brand-600">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {YEAR} {BRAND.name}. All rights reserved.</p>
          <p>Built for teams that want to work smarter.</p>
        </div>
      </div>
    </footer>
  )
}
