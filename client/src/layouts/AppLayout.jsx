import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Avatar, RoleBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import DevUserSwitcher from '../components/DevUserSwitcher.jsx'
import { Alert, EmptyState, Spinner } from '../components/Feedback.jsx'
import Icon from '../components/Icon.jsx'
import { useDevUser } from '../context/DevUserContext.jsx'
import { navItemsFor } from '../utils/permissions.js'

function Sidebar({ user, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">N</span>
        <span className="text-base font-semibold tracking-tight text-white">NEOSTATS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {navItemsFor(user.role).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white'}`
            }
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} id={user.id} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { currentUser, loading, error, retry } = useDevUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) return <Spinner label="Loading workspace…" />
  if (error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert onRetry={retry}>{error}</Alert>
      </div>
    )
  }
  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState icon="users" title="No users in the database">
          Run <code className="rounded bg-slate-100 px-1">npm run db:seed</code> from the repository root, then reload.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar user={currentUser} />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-64">
            <Sidebar user={currentUser} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          <strong>Development mode:</strong> the user switcher is a temporary demo tool, not authentication. Login arrives in Phase 3.
        </div>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" icon="menu" />
          <div className="flex-1" />
          <span className="hidden sm:inline-flex">
            <RoleBadge role={currentUser.role} />
          </span>
          <DevUserSwitcher />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {/* key: remount pages when the user changes so they refetch */}
          <Outlet key={currentUser.id} />
        </main>
      </div>
    </div>
  )
}
