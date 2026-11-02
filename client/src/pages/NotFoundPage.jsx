import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Icon name="search" className="h-6 w-6" />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The page you are looking for does not exist or was moved.</p>
      <div className="mt-6">
        <Button to="/dashboard" variant="secondary" icon="left">
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}

export default NotFoundPage
