import { Avatar, RoleBadge } from '../components/Badges.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate } from '../utils/labels.js'
import { roleSummary } from '../utils/permissions.js'

// The signed-in user's own account (data from GET /api/auth/me).
export default function ProfilePage() {
  const { currentUser } = useAuth()

  return (
    <>
      <PageHeader title="Profile" description="Your account. Contact an Admin to change your role, email or password." />
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={currentUser.name} id={currentUser.id} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{currentUser.name}</p>
            <p className="truncate text-sm text-slate-500">{currentUser.email}</p>
          </div>
          <div className="ml-auto">
            <RoleBadge role={currentUser.role} />
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">What you can do</dt>
            <dd className="mt-1 text-slate-900">{roleSummary(currentUser.role)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Member since</dt>
            <dd className="mt-1 text-slate-900">{formatDate(currentUser.createdAt)}</dd>
          </div>
        </dl>
      </Card>
    </>
  )
}
