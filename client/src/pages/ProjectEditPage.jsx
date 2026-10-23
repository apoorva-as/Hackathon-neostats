import { useNavigate, useParams } from 'react-router'
import { Alert, NotAllowed, Spinner } from '../components/Feedback.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectForm from '../components/ProjectForm.jsx'
import { useApi } from '../hooks/useApi.js'
import { getProject, updateProject } from '../services/projects.js'
import { listUsers } from '../services/users.js'

export default function ProjectEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = useApi(() => getProject(id), [id])
  const canAssignManager = project.data?.permissions.canAssignManager ?? false
  const managers = useApi(
    () => (canAssignManager ? listUsers({ role: 'PROJECT_MANAGER', isActive: 'true' }) : Promise.resolve(null)),
    [canAssignManager],
  )

  if (project.loading && !project.data) return <Spinner />
  if (project.error) return <Alert onRetry={project.reload}>{project.error}</Alert>
  if (!project.data.permissions.canEdit) return <NotAllowed>You cannot edit this project.</NotAllowed>

  async function handleSubmit(payload) {
    await updateProject(id, payload)
    navigate(`/projects/${id}`, { state: { notice: 'Project details were saved.' } })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit project" description={project.data.name} back={{ to: `/projects/${id}`, label: 'Back to project' }} />
      {managers.error && <Alert onRetry={managers.reload}>{managers.error}</Alert>}
      {managers.loading ? (
        <Spinner />
      ) : (
        <ProjectForm
          initialValues={project.data}
          managers={managers.data?.items ?? []}
          canAssignManager={canAssignManager}
          currentManager={project.data.manager}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/projects/${id}`)}
        />
      )}
    </div>
  )
}
