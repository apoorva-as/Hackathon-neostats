import { AnimatePresence, motion } from 'motion/react'
import { Fragment, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Avatar, RoleBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import Dropdown from '../components/Dropdown.jsx'
import { Spinner } from '../components/Feedback.jsx'
import Icon from '../components/Icon.jsx'
import Logo, { LogoMark } from '../components/Logo.jsx'
import SearchPalette from '../components/SearchPalette.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { listProjects } from '../services/projects.js'
import { ROLE_LABELS } from '../utils/labels.js'
import { breadcrumbsFor, canCreateProject, navItemsFor } from '../utils/permissions.js'

const COLLAPSE_KEY = 'worksphere.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function Sidebar({ user, collapsed, onToggle, onNavigate, onSignOut, mobile = false }) {
  const items = navItemsFor(user.role)
  return (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white">
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link to="/dashboard" onClick={onNavigate} aria-label="WORKSPHERE dashboard">
          {collapsed ? <LogoMark className="h-8 w-8" /> : <Logo />}
        </Link>
        {!mobile && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Collapse sidebar"
          >
            <Icon name="collapse-left" className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={`flex-1 space-y-0.5 py-3 ${collapsed ? 'px-2' : 'px-3'}`} aria-label="Main">
        {!collapsed && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>}
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex h-9 items-center gap-3 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center' : 'px-3'} ${isActive ? 'text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={mobile ? 'nav-active-mobile' : 'nav-active'}
                    className="absolute inset-0 rounded-lg bg-brand-50 ring-1 ring-brand-100"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon name={item.icon} className={`relative h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!collapsed && <span className="relative">{item.label}</span>}
                {collapsed && (
                  // Tooltip shown when the sidebar is collapsed.
                  <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {!mobile && collapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Expand sidebar"
          >
            <Icon name="collapse-right" className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={`border-t border-slate-100 ${collapsed ? 'p-2' : 'p-3'}`}>
        <Dropdown
          align="left"
          placement="top"
          header={
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          }
          items={[
            { label: 'Profile & settings', icon: 'user', to: '/profile' },
            'divider',
            { label: 'Sign out', icon: 'logout', onClick: onSignOut, danger: true },
          ]}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-100 ${collapsed ? 'justify-center' : ''}`}
              aria-label="Account menu"
            >
              <Avatar name={user.name} id={user.id} size="sm" />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{user.name}</span>
                    <span className="block truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
                  </span>
                  <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                </>
              )}
            </button>
          )}
        />
      </div>
    </div>
  )
}

// "Create" button in the top bar. Admin creates projects/users; a Project
// Manager creates tasks in one of their (non-archived) projects.
function CreateMenu({ user }) {
  const isPm = user.role === 'PROJECT_MANAGER'
  const projects = useApi(() => (isPm ? listProjects({ limit: 100 }) : Promise.resolve(null)), [isPm])

  if (canCreateProject(user)) {
    return (
      <Dropdown
        items={[
          { label: 'New project', icon: 'folder', to: '/projects/new' },
          { label: 'New user', icon: 'user-plus', to: '/users?new=1' },
        ]}
        trigger={({ toggle }) => (
          <Button icon="plus" size="sm" onClick={toggle}>
            <span className="hidden sm:inline">Create</span>
          </Button>
        )}
      />
    )
  }
  if (isPm) {
    const open = (projects.data?.items ?? []).filter((p) => p.status !== 'ARCHIVED')
    return (
      <Dropdown
        header={<p className="text-xs font-medium text-slate-500">New task in…</p>}
        items={
          open.length > 0
            ? open.slice(0, 8).map((p) => ({ label: p.name, icon: 'folder', to: `/projects/${p.id}/tasks/new` }))
            : [{ label: projects.loading ? 'Loading projects…' : 'No open projects', icon: 'folder' }]
        }
        trigger={({ toggle }) => (
          <Button icon="plus" size="sm" onClick={toggle}>
            <span className="hidden sm:inline">New task</span>
          </Button>
        )}
      />
    )
  }
  return null
}

// Only rendered for a signed-in user (see RequireAuth in App.jsx).
export default function AppLayout() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [searchOpen, setSearchOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {
        // Storage unavailable (private mode): the choice just isn't remembered.
      }
      return !value
    })
  }

  // Ctrl/⌘ + K opens search.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const crumbs = breadcrumbsFor(location.pathname)
  const pageTitle = crumbs[crumbs.length - 1].label

  // Browser tab title follows the page, e.g. "Projects · WORKSPHERE".
  useEffect(() => {
    document.title = `${pageTitle} · WORKSPHERE`
  }, [pageTitle])
  const sidebarWidth = collapsed ? '68px' : '248px'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block"
        style={{ width: sidebarWidth }}
      >
        <Sidebar user={currentUser} collapsed={collapsed} onToggle={toggleCollapsed} onSignOut={handleLogout} />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="relative h-full w-72 shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <Sidebar
                user={currentUser}
                mobile
                onNavigate={() => setMobileOpen(false)}
                onSignOut={() => {
                  setMobileOpen(false)
                  handleLogout()
                }}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="transition-[padding] duration-200 ease-out lg:pl-[var(--sidebar-w)]" style={{ '--sidebar-w': sidebarWidth }}>
        {currentUser.role === 'VIEWER' && (
          <div className="flex items-center justify-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-900">
            <Icon name="eye" className="h-3.5 w-3.5" />
            <span>
              <strong>Read-only access:</strong> you can view projects, teams, tasks and comments, but not change them.
            </span>
          </div>
        )}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
            {crumbs.map((crumb, i) => (
              <Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && <Icon name="right" className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="truncate text-slate-500 transition-colors hover:text-slate-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-slate-900" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </Fragment>
            ))}
          </nav>
          <Link to="/dashboard" className="md:hidden" aria-label="Dashboard">
            <LogoMark className="h-7 w-7" />
          </Link>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-white sm:w-64"
            aria-label="Search projects and tasks"
          >
            <Icon name="search" className="h-4 w-4" />
            <span className="hidden flex-1 text-left sm:inline">Search…</span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400 sm:inline">Ctrl K</kbd>
          </button>

          <CreateMenu user={currentUser} />

          <Dropdown
            header={
              <div className="flex items-center gap-3">
                <Avatar name={currentUser.name} id={currentUser.id} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{currentUser.name}</p>
                  <RoleBadge role={currentUser.role} />
                </div>
              </div>
            }
            items={[
              { label: 'Profile', icon: 'user', to: '/profile' },
              { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
              'divider',
              { label: 'Sign out', icon: 'logout', onClick: handleLogout, danger: true },
            ]}
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} className="rounded-full transition-shadow hover:ring-4 hover:ring-slate-100" aria-label="Profile menu">
                <Avatar name={currentUser.name} id={currentUser.id} size="sm" />
              </button>
            )}
          />
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Fade/slide each page in. Keyed by user so pages refetch when the user changes. */}
          <motion.div
            key={`${currentUser.id}-${location.pathname}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Pages are lazy-loaded; keep the shell visible while one loads. */}
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
