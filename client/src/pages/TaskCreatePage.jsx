import { useNavigate, useParams } from 'react-router'
import { Alert, NotAllowed, Spinner } from '../components/Feedback.jsx'
import PageHeader, { Card } from '../components/PageHeader.jsx'
import TaskForm from '../components/TaskForm.jsx'
import { useApi } from '../hooks/useApi.js'
import { getProject, listMembers } from '../services/projects.js'
import { createTask } from '../services/tasks.js'
import { eligibleAssignees, emptyTaskValues, toCreatePayload } from '../utils/taskForm.js'

// /projects/:id/tasks/new: only the project's manager (the API re-checks).
export default function TaskCreatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApi(async () => {
    const project = await getProject(id)
    const members = project.permissions.canManageTasks ? await listMembers(id) : []
    return { project, members }
  }, [id])

  if (data.loading && !data.data) return <Spinner />
  if (data.error) return <Alert onRetry={data.reload}>{data.error}</Alert>

  const { project, members } = data.data
  const back = { to: `/projects/${project.id}`, label: project.name }
  if (!project.permissions.canManageTasks) {
    return <NotAllowed>Only this project&apos;s manager can create tasks.</NotAllowed>
  }
  if (project.status === 'ARCHIVED') {
    return (
      <>
        <PageHeader title="New task" back={back} />
        <Alert type="info">This project is archived. Change its status before adding tasks.</Alert>
      </>
    )
  }

  async function handleSubmit(values) {
    const task = await createTask(project.id, toCreatePayload(values))
    navigate(`/tasks/${task.id}`, { state: { notice: `Task "${task.title}" was created.` } })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New task" description={`Add a task to ${project.name}.`} back={back} />
      <Card>
        <TaskForm
          initialValues={emptyTaskValues()}
          assignees={eligibleAssignees(members)}
          submitLabel="Create task"
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/projects/${project.id}`)}
        />
      </Card>
    </div>
  )
}
