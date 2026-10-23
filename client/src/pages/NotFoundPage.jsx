import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <Link to="/" className="text-indigo-600 hover:underline">
        Go to home
      </Link>
    </main>
  )
}

export default NotFoundPage
