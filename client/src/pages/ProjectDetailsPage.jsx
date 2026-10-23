import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Avatar, StatusBadge } from '../components/Badges.jsx'
import Button from '../components/Button.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Alert, Spinner } from '../components/Feedback.jsx'
import { inputClass } from '../components/FormField.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import ProjectTasksSection from '../components/ProjectTasksSection.jsx'
import TeamSection from '../components/TeamSection.jsx'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage } from '../services/api.js'
import { deleteProject, getProject, updateProject } from '../services/projects.js'
import { listUsers } from '../services/users.js'
import { formatDate } from '../utils/labels.js'

// Admin-only: assign or change the project manager in place.
function ManagerAssignment({ project, onAssigned }) {
  const managers = useApi(() => listUsers({ role: 'PROJECT_MANAGER', isActive: 'true' }), [])
  const [managerId, setManagerId] = useState(project.managerId ? String(project.managerId) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [counter, setCounter] = useState(0)
  const unchanged = (managerId || null) === (project.managerId ? String(project.managerId) : null)

  async function handleAssign() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProject(project.id, { managerId: managerId ? Number(managerId) : null })
      onAssigned(updated.manager ? `${updated.manager.name} now manages this project.` : 'The project manager was unassigned.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          disabled={managers.loading}
          aria-label="Project manager"
          className={`${inputClass(false)} flex-1`}
        >
          <option value="">No manager</option>
          {(managers.data?.items ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={handleAssign} loading={saving} disabled={unchanged}>
          Assign
        </Button>
      </div>
      {(error || managers.error) && <p className="text-sm text-red-600">{error || managers.error}</p>}
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: project, loading, error, reload } = useApi(() => getProject(id), [id])
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  if (loading && !project) return <Spinner />
  if (error) {
    return (
      <>
        <PageHeader title="Project" back={{ to: '/projects', label: 'Projects' }} />
        <Alert onRetry={reload}>{error}</Alert>
      </>
    )
  }

  const { permissions } = project
  const readOnly = !permissions.canEdit && !permissions.canManageMembers && !permissions.canManageTasks

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteProject(project.id)
      navigate('/projects', { state: { notice: `Project "${project.name}" was deleted.` } })
    } catch (err) {
      setDeleteError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title={project.name}
        back={{ to: '/projects', label: 'Projects' }}
        actions={
          <>
            {permissions.canEdit && (
              <Button variant="secondary" icon="edit" to={`/projects/${project.id}/edit`}>
                Edit
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => {
                  setDeleteError(null)
                  setConfirmDelete(true)
                }}
              >
                Delete
              </Button>
            )}
          </>
        }
      >
        <StatusBadge status={project.status} />
        {readOnly && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <Icon name="lock" className="h-3 w-3" /> Read-only
          </span>
        )}
      </PageHeader>

      {notice && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>{notice}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="About">
            {project.description ? (
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{project.description}</p>
            ) : (
              <p className="text-sm italic text-slate-400">No description.</p>
            )}
          </Card>

          <ProjectTasksSection project={project} />

          <TeamSection project={project} onTeamChanged={reload} />
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="-my-2.5 divide-y divide-slate-100">
              <DetailRow label="Project manager">
                {project.manager ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={project.manager.name} id={project.manager.id} size="sm" />
                    <span>
                      {project.manager.name}
                      <span className="block text-xs text-slate-500">{project.manager.email}</span>
                    </span>
                  </span>
                ) : (
                  <span className="italic text-slate-400">Unassigned</span>
                )}
              </DetailRow>
              {permissions.canAssignManager && (
                <div className="py-2.5">
                  <ManagerAssignment
                    key={project.managerId ?? 'none'}
                    project={project}
                    onAssigned={(message) => {
                      setNotice(message)
                      reload()
                    }}
                  />
                </div>
              )}
              <DetailRow label="Members">{project.memberCount}</DetailRow>
              <DetailRow label="Created">{formatDate(project.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{formatDate(project.updatedAt)}</DetailRow>
              {project.archivedAt && <DetailRow label="Archived">{formatDate(project.archivedAt)}</DetailRow>}
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        confirmLabel="Delete project"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <strong>{project.name}</strong>, its tasks and comments, and its {project.memberCount} team membership
        {project.memberCount === 1 ? '' : 's'} will be permanently deleted. User accounts are not affected. To keep the history instead, set the status to Archived.
      </ConfirmDialog>
    </>
  )
}
