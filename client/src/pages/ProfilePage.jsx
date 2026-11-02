import { Avatar, RoleBadge } from '../components/Badges.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate, ROLE_LABELS } from '../utils/labels.js'
import { roleSummary } from '../utils/permissions.js'

// The signed-in user's own account (data from GET /api/auth/me).
export default function ProfilePage() {
  const { currentUser } = useAuth()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" description="Your account. Contact an Admin to change your role, email or password." />
      <Card padded={false}>
        <div className="h-24 rounded-t-xl bg-gradient-to-r from-brand-600 via-violet-600 to-sky-500" />
        <div className="px-6 pb-6">
          <div className="-mt-8 flex flex-wrap items-end gap-4">
            <span className="rounded-full ring-4 ring-white">
              <Avatar name={currentUser.name} id={currentUser.id} size="xl" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="truncate text-lg font-semibold text-slate-900">{currentUser.name}</p>
              <p className="truncate text-sm text-slate-500">{currentUser.email}</p>
            </div>
            <div className="pb-1">
              <RoleBadge role={currentUser.role} />
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { icon: 'shield', label: 'Role', value: ROLE_LABELS[currentUser.role] },
              { icon: 'calendar', label: 'Member since', value: formatDate(currentUser.createdAt) },
              { icon: 'key', label: 'What you can do', value: roleSummary(currentUser.role), wide: true },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/60 ${item.wide ? 'sm:col-span-2' : ''}`}>
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Icon name={item.icon} className="h-3.5 w-3.5" />
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>
    </div>
  )
}
