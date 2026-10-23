import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../services/api.js'
import { STATUS_LABELS, PROJECT_STATUSES } from '../utils/labels.js'
import { DESCRIPTION_MAX, toProjectPayload, validateProjectForm } from '../utils/projectForm.js'
import Button from './Button.jsx'
import { Alert } from './Feedback.jsx'
import FormField, { inputClass } from './FormField.jsx'
import { Card } from './PageHeader.jsx'

// Create/edit form. `managers` = users with the PROJECT_MANAGER role.
// When `canAssignManager` is false the manager is shown read-only.
export default function ProjectForm({
  initialValues,
  managers = [],
  canAssignManager,
  currentManager,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState({
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
    status: initialValues?.status ?? 'ACTIVE',
    managerId: initialValues?.managerId ? String(initialValues.managerId) : '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateProjectForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(toProjectPayload(values, { includeManager: canAssignManager }))
    } catch (error) {
      setErrors(getFieldErrors(error))
      setSubmitError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <div className="space-y-5">
          {submitError && <Alert onDismiss={() => setSubmitError(null)}>{submitError}</Alert>}

          <FormField label="Project name" htmlFor="name" error={errors.name} required>
            <input
              id="name"
              value={values.name}
              onChange={update('name')}
              className={inputClass(errors.name)}
              placeholder="e.g. Website Redesign"
              maxLength={120}
              autoFocus
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description}
            hint={`${values.description.length}/${DESCRIPTION_MAX} characters`}
          >
            <textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={update('description')}
              className={inputClass(errors.description)}
              placeholder="What is this project about?"
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Status" htmlFor="status" error={errors.status}>
              <select id="status" value={values.status} onChange={update('status')} className={inputClass(errors.status)}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Project manager"
              htmlFor="managerId"
              error={errors.managerId}
              hint={canAssignManager ? 'Only users with the Project Manager role are listed.' : 'Only an Admin can change the manager.'}
            >
              {canAssignManager ? (
                <select
                  id="managerId"
                  value={values.managerId}
                  onChange={update('managerId')}
                  className={inputClass(errors.managerId)}
                >
                  <option value="">No manager yet</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input id="managerId" disabled value={currentManager?.name ?? 'Unassigned'} className={inputClass(false)} />
              )}
            </FormField>
          </div>
        </div>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
