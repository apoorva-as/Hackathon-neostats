import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { ScreenLoader } from './components/Feedback.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'

// Pages are loaded on demand (separate bundles), so visitors of the landing
// page do not download the whole app and vice versa.
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'))
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'))
const ProjectCreatePage = lazy(() => import('./pages/ProjectCreatePage.jsx'))
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage.jsx'))
const ProjectEditPage = lazy(() => import('./pages/ProjectEditPage.jsx'))
const TaskCreatePage = lazy(() => import('./pages/TaskCreatePage.jsx'))
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'))
const TaskDetailsPage = lazy(() => import('./pages/TaskDetailsPage.jsx'))
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

// Public: / (marketing landing page), /login, /signup (request access; accounts
// are created by an Admin), /privacy, /terms. Everything else needs a
// signed-in user (RequireAuth). Pages decide what each role sees; the API
// enforces every permission again.
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<ScreenLoader label="Loading…" />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/terms" element={<LegalPage kind="terms" />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<ProjectCreatePage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
              <Route path="/projects/:id/tasks/new" element={<TaskCreatePage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
