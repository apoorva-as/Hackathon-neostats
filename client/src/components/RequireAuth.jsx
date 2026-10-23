import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { Alert, Spinner } from './Feedback.jsx'

// Route guard: renders the protected pages only for a signed-in user and
// sends everyone else to /login (remembering where they wanted to go).
// This is navigation only; the API rejects unauthenticated requests anyway.
export default function RequireAuth({ children }) {
  const { status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner label="Checking your session…" />
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert onRetry={retry}>{error}</Alert>
      </div>
    )
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
