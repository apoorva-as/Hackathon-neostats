import { listAllProjects } from '../services/projects.js'
import { listAllTasks } from '../services/tasks.js'
import { useApi } from './useApi.js'

// Loads every project and task the signed-in user may see (the API applies
// role visibility) so dashboards can compute their numbers from real data.
// `taskParams` narrows the task list, e.g. { assigneeId } for "my tasks".
export function useWorkspaceData(taskParams = {}, deps = []) {
  return useApi(async () => {
    const [projects, tasks] = await Promise.all([listAllProjects(), listAllTasks(taskParams)])
    return { projects: projects.items, tasks: tasks.items }
  }, deps)
}
