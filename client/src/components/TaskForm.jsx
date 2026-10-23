import { useState } from 'react'
import { getErrorMessage, getFieldErrors, isVersionConflict } from '../services/api.js'
import { PRIORITY_LABELS, TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS } from '../utils/labels.js'
import { ALL_TASK_FIELDS, TASK_DESCRIPTION_MAX, TITLE_MAX, validateTaskForm } from '../utils/taskForm.js'
import Button from './Button.jsx'
import { Alert } from './Feedback.jsx'
import FormField, { inputClass } from './FormField.jsx'

// Create/edit form for a task. Fields not in `editableFields` are shown
// disabled (e.g. a Team Member may only change status and description).
// `onSubmit(values)` may throw; a 409 VERSION_CONFLICT shows a reload prompt
// and keeps the user's draft on screen. It never retries automatically.
export default function TaskForm({
  initialValues,
  editableFields = ALL_TASK_FIELDS,
  assignees = [],
  submitLabel,
  onSubmit,
  onCancel,
  onReloadLatest,
}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const can = (field) => editableFields.includes(field)

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateTaskForm(values, editableFields)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    setConflict(null)
    try {
      await onSubmit(values)
    } catch (error) {
      if (isVersionConflict(error)) {
        setConflict(getErrorMessage(error))
      } else {
        setErrors(getFieldErrors(error))
        setSubmitError(getErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {conflict && (
        <Alert type="warning">
          <p className="font-medium">This task changed since you opened it. Your changes were not saved.</p>
          <p className="mt-1">{conflict}</p>
          {onReloadLatest && (
            <button type="button" onClick={onReloadLatest} className="mt-2 font-medium underline underline-offset-2">
              Reload the latest version
            </button>
          )}
        </Alert>
      )}
      {submitError && <Alert onDismiss={() => setSubmitError(null)}>{submitError}</Alert>}

      <FormField label="Title" htmlFor="task-title" error={errors.title} required={can('title')}>
        <input
          id="task-title"
          value={values.title}
          onChange={update('title')}
          disabled={!can('title')}
          className={inputClass(errors.title)}
          placeholder="e.g. Design the homepage hero"
          maxLength={TITLE_MAX}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="task-description"
        error={errors.description}
        hint={can('description') ? `${values.description.length}/${TASK_DESCRIPTION_MAX} characters` : undefined}
      >
        <textarea
          id="task-description"
          rows={4}
          value={values.description}
          onChange={update('description')}
          disabled={!can('description')}
          className={inputClass(errors.description)}
          placeholder="Details, acceptance criteria, links…"
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Status" htmlFor="task-status" error={errors.status}>
          <select id="task-status" value={values.status} onChange={update('status')} disabled={!can('status')} className={inputClass(errors.status)}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Priority" htmlFor="task-priority" error={errors.priority}>
          <select
            id="task-priority"
            value={values.priority}
            onChange={update('priority')}
            disabled={!can('priority')}
            className={inputClass(errors.priority)}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Due date" htmlFor="task-due" error={errors.dueDate} hint={can('dueDate') ? 'Optional' : undefined}>
          <input
            id="task-due"
            type="date"
            value={values.dueDate}
            onChange={update('dueDate')}
            disabled={!can('dueDate')}
            className={inputClass(errors.dueDate)}
          />
        </FormField>

        <FormField
          label="Assignee"
          htmlFor="task-assignee"
          error={errors.assigneeId}
          hint={can('assigneeId') ? 'Only active team members of this project (not read-only) are listed.' : undefined}
        >
          <select
            id="task-assignee"
            value={values.assigneeId}
            onChange={update('assigneeId')}
            disabled={!can('assigneeId')}
            className={inputClass(errors.assigneeId)}
          >
            <option value="">Unassigned</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
