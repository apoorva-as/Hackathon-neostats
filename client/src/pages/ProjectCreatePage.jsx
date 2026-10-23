import { useNavigate } from 'react-router'
import { Alert, NotAllowed, Spinner } from '../components/Feedback.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectForm from '../components/ProjectForm.jsx'
import { useDevUser } from '../context/DevUserContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { createProject } from '../services/projects.js'
import { listUsers } from '../services/users.js'
import { canCreateProject } from '../utils/permissions.js'

export default function ProjectCreatePage() {
  const { currentUser } = useDevUser()
  const navigate = useNavigate()
  const allowed = canCreateProject(currentUser)
  const managers = useApi(
    () => (allowed ? listUsers({ role: 'PROJECT_MANAGER', isActive: 'true' }) : Promise.resolve(null)),
    [allowed],
  )

  if (!allowed) return <NotAllowed>Only an Admin can create projects.</NotAllowed>

  async function handleSubmit(payload) {
    const project = await createProject(payload)
    navigate(`/projects/${project.id}`, { state: { notice: `Project "${project.name}" was created.` } })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New project"
        description="Create a project and optionally assign its project manager."
        back={{ to: '/projects', label: 'Projects' }}
      />
      {managers.error && <Alert onRetry={managers.reload}>{managers.error}</Alert>}
      {managers.loading ? (
        <Spinner />
      ) : (
        <ProjectForm
          managers={managers.data?.items ?? []}
          canAssignManager
          submitLabel="Create project"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/projects')}
        />
      )}
    </div>
  )
}
