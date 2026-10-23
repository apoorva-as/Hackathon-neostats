// Label + control + hint/error. Pass the control as children.
export default function FormField({ label, htmlFor, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
}

// Shared Tailwind classes for inputs, selects and textareas.
// eslint-disable-next-line react/only-export-components
export const inputClass = (hasError) =>
  `block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset disabled:bg-slate-50 disabled:text-slate-500 ${hasError ? 'ring-red-300 focus:ring-red-500' : 'ring-slate-300 focus:ring-indigo-600'}`
