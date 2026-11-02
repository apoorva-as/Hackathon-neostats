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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}
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
      <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/80 px-6 py-3">
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
