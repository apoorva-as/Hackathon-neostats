import { useEffect } from 'react'
import { BRAND } from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AdminDashboard from './dashboards/AdminDashboard.jsx'
import ManagerDashboard from './dashboards/ManagerDashboard.jsx'
import MemberDashboard from './dashboards/MemberDashboard.jsx'
import ViewerDashboard from './dashboards/ViewerDashboard.jsx'

const DASHBOARDS = {
  ADMIN: AdminDashboard,
  PROJECT_MANAGER: ManagerDashboard,
  TEAM_MEMBER: MemberDashboard,
  VIEWER: ViewerDashboard,
}

// Each role gets its own dashboard. All numbers come from the API, which only
// returns what the signed-in user is allowed to see.
export default function DashboardPage() {
  const { currentUser } = useAuth()
  const Dashboard = DASHBOARDS[currentUser.role] ?? ViewerDashboard

  useEffect(() => {
    document.title = `Dashboard · ${BRAND.name}`
  }, [])

  return <Dashboard user={currentUser} />
}
