import Button from '../components/Button.jsx'
import { EmptyState } from '../components/Feedback.jsx'

function NotFoundPage() {
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      action={<Button to="/dashboard" variant="secondary">Go to dashboard</Button>}
    >
      The page you are looking for does not exist.
    </EmptyState>
  )
}

export default NotFoundPage
