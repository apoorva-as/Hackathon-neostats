// What the UI shows for each role. These are UX hints ONLY: the server
// enforces every permission again and rejects anything not allowed.

export function navItemsFor(role) {
  const dashboard = { to: '/dashboard', label: 'Dashboard', icon: 'home' }
  switch (role) {
    case 'ADMIN':
      return [dashboard, { to: '/projects', label: 'Projects', icon: 'folder' }, { to: '/users', label: 'Users', icon: 'users' }]
    case 'PROJECT_MANAGER':
    case 'TEAM_MEMBER':
      return [dashboard, { to: '/projects', label: 'My projects', icon: 'folder' }]
    case 'VIEWER':
      return [dashboard, { to: '/projects', label: 'Projects', icon: 'folder' }]
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
      return 'You see the projects you manage and can add or remove their team members.'
    case 'TEAM_MEMBER':
      return 'You see the projects you belong to and who you work with.'
    case 'VIEWER':
      return 'You have read-only access to projects and their teams.'
    default:
      return ''
  }
}

export function projectsHeading(role) {
  if (role === 'PROJECT_MANAGER') return 'Projects you manage'
  if (role === 'TEAM_MEMBER') return 'Projects you belong to'
  return 'All projects'
}
