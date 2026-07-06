import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthError } from '../api/auth.api'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'PARENT' | 'CHILD'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (error instanceof AuthError && error.statusCode === 401) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (error && !(error instanceof AuthError)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-rose-400 mb-2">Connection Error</h1>
          <p className="text-zinc-400 mb-4">Unable to reach the server. Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-rose-400">403 Forbidden</h1>
          <p className="text-zinc-400 mt-2">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
