import { useEffect, useRef } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

// Modal confirmation built on the native <dialog> element
// (focus trapping and Esc-to-close come for free).
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
  error,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!loading) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}
          >
            <Icon name="alert" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <div className="mt-2 text-sm text-slate-600">{children}</div>
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 rounded-b-xl bg-slate-50 px-6 py-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
