import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { Alert, ScreenLoader } from './Feedback.jsx'

// Route guard: renders the protected pages only for a signed-in user and
// sends everyone else to the landing page "/" (remembering where they wanted
// to go, so "Sign in" there can bring them back after login).
// This is navigation only; the API rejects unauthenticated requests anyway.
export default function RequireAuth({ children }) {
  const { status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <ScreenLoader label="Checking your session…" />
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert onRetry={retry}>{error}</Alert>
      </div>
    )
  }
  if (status !== 'authenticated') {
    return <Navigate to="/" replace state={{ from: location }} />
  }
  return children
}
