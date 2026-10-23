import { Navigate, Route, Routes } from 'react-router'
import { DevUserProvider } from './context/DevUserContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProjectCreatePage from './pages/ProjectCreatePage.jsx'
import ProjectDetailsPage from './pages/ProjectDetailsPage.jsx'
import ProjectEditPage from './pages/ProjectEditPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import UsersPage from './pages/UsersPage.jsx'

// Pages decide what each role sees; the API enforces every permission again.
function App() {
  return (
    <DevUserProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectCreatePage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </DevUserProvider>
  )
}

export default App
