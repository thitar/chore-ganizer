import { useState } from 'react'
import { useAuth, useNotifications, AuthProvider } from './hooks'
import { ErrorBoundary } from './components/common'
import { Navbar, Sidebar, Footer } from './components/layout'
import { Login, Dashboard, Chores, Templates, Profile, NotFound, Users, Calendar } from './pages'

function AppContent() {
  const { isAuthenticated, loading, isParent } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const [currentPage, setCurrentPage] = useState('dashboard')

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
    return <Login />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'chores':
        return <Chores />
      case 'templates':
        // Templates is parents-only - redirect children to dashboard
        if (!isParent) {
          return <Dashboard />
        }
        return <Templates />
      case 'profile':
        return <Profile />
      case 'calendar':
        // Family Calendar is parents-only - redirect children to dashboard
        if (!isParent) {
          return <Dashboard />
        }
        return <Calendar />
      case 'users':
        return <Users />
      default:
        return <NotFound />
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {renderPage()}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
