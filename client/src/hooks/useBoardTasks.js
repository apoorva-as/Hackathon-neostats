import { useCallback, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { getErrorMessage, isVersionConflict } from '../services/api.js'
import { updateTask } from '../services/tasks.js'
import { TASK_STATUS_LABELS } from '../utils/labels.js'
import { useApi } from './useApi.js'

// Tasks for a board, plus moveTask(task, status) for drag-and-drop.
// The move is shown immediately (optimistic) and sent as
// PATCH /tasks/:id { version, status }. If the server refuses (403, 409
// VERSION_CONFLICT, archived project…) the card goes back and a toast
// explains why; on a conflict the board reloads the latest data.
export function useBoardTasks(fetcher, deps) {
  const toast = useToast()
  const source = useApi(fetcher, deps)
  // Local edits are tied to the API response they were made on; a fresh
  // response (reload, new filters) replaces them automatically.
  const [local, setLocal] = useState({ base: null, items: [] })
  const [savingId, setSavingId] = useState(null)
  const tasks = local.base === source.data ? local.items : (source.data?.items ?? [])
  const base = source.data
  const setTasks = useCallback(
    (update) => setLocal((prev) => ({ base, items: update(prev.base === base ? prev.items : (base?.items ?? [])) })),
    [base],
  )

  const { reload } = source
  const moveTask = useCallback(
    async (task, status) => {
      if (task.status === status) return
      setSavingId(task.id)
      setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status } : t)))
      try {
        const updated = await updateTask(task.id, { version: task.version, status })
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, ...updated } : t)))
        toast.success(`“${task.title}” moved to ${TASK_STATUS_LABELS[status]}.`)
      } catch (err) {
        setTasks((list) => list.map((t) => (t.id === task.id ? task : t)))
        if (isVersionConflict(err)) {
          toast.error('This task was changed by someone else. The board now shows the latest version.')
          reload()
        } else {
          toast.error(getErrorMessage(err))
        }
      } finally {
        setSavingId(null)
      }
    },
    [toast, reload, setTasks],
  )

  // Replace one task after it was edited elsewhere (e.g. in the drawer).
  const replaceTask = useCallback(
    (updated) => setTasks((list) => list.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))),
    [setTasks],
  )

  return { ...source, tasks, moveTask, replaceTask, savingId }
}
