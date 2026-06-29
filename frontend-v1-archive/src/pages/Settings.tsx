import { Link } from 'react-router-dom'
import { useAuth } from '../hooks'

export function Settings() {
  const { isParent } = useAuth()

  if (!isParent) return null

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Rate limit monitoring has moved to the{' '}
          <Link to="/admin" className="font-semibold underline hover:text-blue-600">Admin Dashboard</Link>.
        </p>
      </div>
    </div>
  )
}
