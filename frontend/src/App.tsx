import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { MyChoresPage } from './pages/MyChoresPage'
import { RecurringChoresPage } from './pages/RecurringChoresPage'
import { PointsPage } from './pages/PointsPage'
import { CalendarPage } from './pages/CalendarPage'
import { UsersPage } from './pages/UsersPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/templates" element={
          <ProtectedRoute requiredRole="PARENT">
            <TemplatesPage />
          </ProtectedRoute>
        } />
        <Route path="/recurring-chores" element={
          <ProtectedRoute requiredRole="PARENT">
            <RecurringChoresPage />
          </ProtectedRoute>
        } />
        <Route path="/assignments" element={
          <ProtectedRoute requiredRole="PARENT">
            <AssignmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute requiredRole="PARENT">
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/my-chores" element={
          <ProtectedRoute>
            <MyChoresPage />
          </ProtectedRoute>
        } />
        <Route path="/points" element={
          <ProtectedRoute>
            <PointsPage />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
