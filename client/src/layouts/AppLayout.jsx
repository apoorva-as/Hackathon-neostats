import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { Avatar, RoleBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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
        <Link to="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-lg hover:bg-slate-800/60">
          <Avatar name={user.name} id={user.id} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

// Only rendered for a signed-in user (see RequireAuth in App.jsx).
export default function AppLayout() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleLogout() {
    setSigningOut(true)
    await logout()
    navigate('/login', { replace: true })
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
        {currentUser.role === 'VIEWER' && (
          <div className="bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-900">
            <strong>Read-only access:</strong> you can view projects, teams, tasks and comments, but not change them.
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" icon="menu" />
          <div className="flex-1" />
          <span className="hidden text-sm font-medium text-slate-700 md:inline">{currentUser.name}</span>
          <span className="hidden sm:inline-flex">
            <RoleBadge role={currentUser.role} />
          </span>
          <Button variant="secondary" size="sm" icon="logout" loading={signingOut} onClick={handleLogout}>
            Sign out
          </Button>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {/* key: remount pages when the user changes so they refetch */}
          <Outlet key={currentUser.id} />
        </main>
      </div>
    </div>
  )
}
