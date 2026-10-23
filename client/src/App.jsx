import { Navigate, Route, Routes } from 'react-router'
import RequireAuth from './components/RequireAuth.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ProjectCreatePage from './pages/ProjectCreatePage.jsx'
import ProjectDetailsPage from './pages/ProjectDetailsPage.jsx'
import ProjectEditPage from './pages/ProjectEditPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import TaskCreatePage from './pages/TaskCreatePage.jsx'
import TaskDetailsPage from './pages/TaskDetailsPage.jsx'
import UsersPage from './pages/UsersPage.jsx'

// /login is public; everything else needs a signed-in user (RequireAuth).
// Pages decide what each role sees; the API enforces every permission again.
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectCreatePage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
          <Route path="/projects/:id/tasks/new" element={<TaskCreatePage />} />
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
