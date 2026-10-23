import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { getErrorMessage } from '../services/api.js'
import { addMember, listMembers, removeMember, updateMemberRole } from '../services/projects.js'
import { listUsers } from '../services/users.js'
import { PROJECT_ROLE_LABELS, formatDate } from '../utils/labels.js'
import { Avatar, ProjectRoleBadge, RoleBadge } from './Badges.jsx'
import Button from './Button.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { Alert, Spinner } from './Feedback.jsx'
import { inputClass } from './FormField.jsx'
import { Card } from './PageHeader.jsx'

function AddMemberForm({ projectId, memberIds, onAdded }) {
  // Only Team Members can join a project team (enforced by the API too).
  const candidates = useApi(() => listUsers({ role: 'TEAM_MEMBER', isActive: 'true' }), [])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const available = (candidates.data?.items ?? []).filter((u) => !memberIds.includes(u.id))

  async function handleSubmit(event) {
    event.preventDefault()
    if (!userId) return setError('Choose a team member to add.')
    setSaving(true)
    setError(null)
    try {
      const member = await addMember(projectId, { userId: Number(userId), role })
      setUserId('')
      setRole('MEMBER')
      onAdded(member)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (candidates.error) return <Alert onRetry={candidates.reload}>{candidates.error}</Alert>

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            setError(null)
          }}
          className={`${inputClass(false)} sm:flex-1`}
          aria-label="Team member to add"
          disabled={candidates.loading || available.length === 0}
        >
          <option value="">
            {candidates.loading ? 'Loading team members…' : available.length === 0 ? 'Everyone is already on the team' : 'Select a team member…'}
          </option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={`${inputClass(false)} sm:w-36`}
          aria-label="Project role"
        >
          {Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" icon="plus" loading={saving} disabled={!userId}>
          Add
        </Button>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </form>
  )
}

// Project team: manager + members. Management controls appear only when the
// API says the current user may manage members (and the server re-checks).
export default function TeamSection({ project, onTeamChanged }) {
  const members = useApi(() => listMembers(project.id), [project.id])
  const canManage = project.permissions.canManageMembers
  const archived = project.status === 'ARCHIVED'
  const editable = canManage && !archived

  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [toRemove, setToRemove] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const [changingRoleFor, setChangingRoleFor] = useState(null)

  function changed(message) {
    setNotice(message)
    setActionError(null)
    members.reload()
    onTeamChanged?.()
  }

  async function handleRoleChange(member, role) {
    setChangingRoleFor(member.user.id)
    try {
      await updateMemberRole(project.id, member.user.id, role)
      changed(`${member.user.name} is now "${PROJECT_ROLE_LABELS[role]}" on this project.`)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setChangingRoleFor(null)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setRemoveError(null)
    try {
      await removeMember(project.id, toRemove.user.id)
      changed(`${toRemove.user.name} was removed from the project.`)
      setToRemove(null)
    } catch (err) {
      setRemoveError(getErrorMessage(err))
    } finally {
      setRemoving(false)
    }
  }

  const list = members.data ?? []

  return (
    <Card title={`Team${members.data ? ` · ${list.length + (project.manager ? 1 : 0)}` : ''}`} padded={false}>
      <div className="space-y-4 p-5">
        {notice && <Alert type="success" onDismiss={() => setNotice(null)}>{notice}</Alert>}
        {actionError && <Alert onDismiss={() => setActionError(null)}>{actionError}</Alert>}
        {canManage && archived && <Alert type="info">This project is archived. Change its status to edit the team.</Alert>}
        {editable && (
          <AddMemberForm
            projectId={project.id}
            memberIds={list.map((m) => m.user.id)}
            onAdded={(m) => changed(`${m.user.name} was added to the project.`)}
          />
        )}
      </div>

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        <li className="flex items-center gap-3 px-5 py-3">
          {project.manager ? (
            <>
              <Avatar name={project.manager.name} id={project.manager.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{project.manager.name}</p>
                <p className="truncate text-xs text-slate-500">{project.manager.email}</p>
              </div>
              <RoleBadge role="PROJECT_MANAGER" />
            </>
          ) : (
            <p className="text-sm italic text-slate-400">No project manager assigned</p>
          )}
        </li>

        {members.loading && !members.data && (
          <li>
            <Spinner label="Loading members…" />
          </li>
        )}
        {members.error && (
          <li className="p-5">
            <Alert onRetry={members.reload}>{members.error}</Alert>
          </li>
        )}
        {members.data && list.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-slate-500">
            No team members yet.{editable && ' Add one above.'}
          </li>
        )}
        {list.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Avatar name={member.user.name} id={member.user.id} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{member.user.name}</p>
              <p className="truncate text-xs text-slate-500">
                {member.user.email} · joined {formatDate(member.createdAt)}
              </p>
            </div>
            {editable ? (
              <div className="flex items-center gap-1">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  disabled={changingRoleFor === member.user.id}
                  aria-label={`Project role for ${member.user.name}`}
                  className="rounded-lg border-0 py-1 pl-2 pr-7 text-xs ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                >
                  {Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost-danger"
                  size="sm"
                  icon="trash"
                  onClick={() => {
                    setRemoveError(null)
                    setToRemove(member)
                  }}
                  aria-label={`Remove ${member.user.name}`}
                />
              </div>
            ) : (
              <ProjectRoleBadge role={member.role} />
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(toRemove)}
        title="Remove team member?"
        confirmLabel="Remove"
        loading={removing}
        error={removeError}
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
      >
        <strong>{toRemove?.user.name}</strong> will lose access to <strong>{project.name}</strong>. Their user account is
        not deleted.
      </ConfirmDialog>
    </Card>
  )
}
