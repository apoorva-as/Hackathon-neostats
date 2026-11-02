// What the UI shows for each role. These are UX hints ONLY: the server
// enforces every permission again and rejects anything not allowed.

export function navItemsFor(role) {
  const dashboard = { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }
  switch (role) {
    case 'ADMIN':
      return [
        dashboard,
        { to: '/projects', label: 'Projects', icon: 'projects' },
        { to: '/tasks', label: 'Tasks', icon: 'tasks' },
        { to: '/users', label: 'Users', icon: 'users' },
      ]
    case 'PROJECT_MANAGER':
      return [dashboard, { to: '/projects', label: 'My projects', icon: 'projects' }, { to: '/tasks', label: 'Tasks', icon: 'tasks' }]
    case 'TEAM_MEMBER':
      return [dashboard, { to: '/projects', label: 'My projects', icon: 'projects' }, { to: '/tasks', label: 'My tasks', icon: 'tasks' }]
    case 'VIEWER':
      return [dashboard, { to: '/projects', label: 'Projects', icon: 'projects' }, { to: '/tasks', label: 'Tasks', icon: 'tasks' }]
    default:
      return [dashboard]
  }
}

export const canCreateProject = (user) => user?.role === 'ADMIN'
export const canViewUsers = (user) => user?.role === 'ADMIN'

// Short description of what each role can do (shown on the dashboard).
export function roleSummary(role) {
  switch (role) {
    case 'ADMIN':
      return 'You can see every project, create and delete projects, and assign project managers.'
    case 'PROJECT_MANAGER':
      return 'You manage your projects: their teams, tasks, assignments and status.'
    case 'TEAM_MEMBER':
      return 'You see your projects and their tasks, update the tasks assigned to you, and comment.'
    case 'VIEWER':
      return 'You have read-only access to projects, teams, tasks and comments.'
    default:
      return ''
  }
}

export function projectsHeading(role) {
  if (role === 'PROJECT_MANAGER') return 'Projects you manage'
  if (role === 'TEAM_MEMBER') return 'Projects you belong to'
  return 'All projects'
}

// UX hint for drag-and-drop / quick status changes on boards. Mirrors the
// server rule (task.policy.js): a Project Manager may change tasks in the
// projects they manage (the only ones they can see); a Team Member only the
// tasks assigned to them. Admin and Viewer are read-only for tasks. Archived
// projects are read-only. The API still decides and answers 403 otherwise.
export function canChangeTaskStatus(user, task) {
  if (!user || !task || task.project?.status === 'ARCHIVED') return false
  if (user.role === 'PROJECT_MANAGER') return true
  if (user.role === 'TEAM_MEMBER') return task.assigneeId === user.id
  return false
}

// Breadcrumb trail for the top bar, derived from the URL only.
export function breadcrumbsFor(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'Workspace', to: '/dashboard' }]
  const [section, id, sub, action] = parts
  if (section === 'dashboard') crumbs.push({ label: 'Dashboard' })
  else if (section === 'users') crumbs.push({ label: 'Users' })
  else if (section === 'profile') crumbs.push({ label: 'Profile' })
  else if (section === 'projects') {
    crumbs.push({ label: 'Projects', to: id ? '/projects' : undefined })
    if (id === 'new') crumbs.push({ label: 'New project' })
    else if (id) {
      crumbs.push({ label: 'Project', to: sub ? `/projects/${id}` : undefined })
      if (sub === 'edit') crumbs.push({ label: 'Edit' })
      if (sub === 'tasks' && action === 'new') crumbs.push({ label: 'New task' })
    }
  } else if (section === 'tasks') {
    crumbs.push({ label: 'Tasks', to: id ? '/tasks' : undefined })
    if (id) crumbs.push({ label: 'Task details' })
  } else crumbs.push({ label: 'Not found' })
  return crumbs
}
