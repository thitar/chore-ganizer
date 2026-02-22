import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthProvider } from './hooks'
import { ErrorBoundary, Loading } from './components/common'
import OfflineIndicator from './components/common/OfflineIndicator'
import { Navbar, Sidebar, Footer } from './components/layout'

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Chores = lazy(() => import('./pages/Chores').then(m => ({ default: m.Chores })))
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })))
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })))
const RecurringChoresPage = lazy(() => import('./pages/RecurringChoresPage').then(m => ({ default: m.RecurringChoresPage })))
const PocketMoney = lazy(() => import('./pages/PocketMoney').then(m => ({ default: m.PocketMoney })))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then(m => ({ default: m.StatisticsPage })))
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loading size="lg" text="Loading page..." />
  </div>
)

// Protected route wrapper for parent-only pages
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isParent } = useAuth()
  
  if (!isParent) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <OfflineIndicator />
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
                } />
                <Route path="/chores" element={
                  <Suspense fallback={<PageLoader />}><Chores /></Suspense>
                } />
                <Route path="/profile" element={
                  <Suspense fallback={<PageLoader />}><Profile /></Suspense>
                } />
                <Route path="/users" element={
                  <Suspense fallback={<PageLoader />}><Users /></Suspense>
                } />
                <Route 
                  path="/templates" 
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}><Templates /></Suspense>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/calendar" 
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}><Calendar /></Suspense>
                    </ProtectedRoute>
                  } 
                />
                <Route path="/recurring-chores" element={
                  <Suspense fallback={<PageLoader />}><RecurringChoresPage /></Suspense>
                } />
                <Route path="/pocket-money" element={
                  <Suspense fallback={<PageLoader />}><PocketMoney /></Suspense>
                } />
                <Route path="/statistics" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}><StatisticsPage /></Suspense>
                  </ProtectedRoute>
                } />
                <Route path="*" element={
                  <Suspense fallback={<PageLoader />}><NotFound /></Suspense>
                } />
              </Routes>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}

// Wrapper component that uses key to force remount on auth state change
// This prevents React DOM reconciliation issues during login/logout transitions
// caused by React StrictMode's double-rendering in development
function AppContentWithKey() {
  const { isAuthenticated, loading } = useAuth()
  
  // Use a key based on auth state to force React to create a new component tree
  // when authentication state changes, preventing insertBefore errors
  const authKey = loading ? 'loading' : (isAuthenticated ? 'authenticated' : 'unauthenticated')
  
  return <AppContent key={authKey} />
}

function App() {
  return (
    <AuthProvider>
      <AppContentWithKey />
    </AuthProvider>
  )
}

export default App
