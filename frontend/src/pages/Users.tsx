import React from 'react'
import { useAuth, useUsers } from '../hooks'
import { Button } from '../components/common'

export const Users: React.FC = () => {
  const { isParent } = useAuth()
  const { users, loading, error, deleteUser } = useUsers()

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    const result = await deleteUser(id)
    if (result.success) {
      alert('User deleted successfully')
    } else {
      alert(result.error || 'Failed to delete user')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Family Members</h1>
        <p className="text-gray-600">Manage your family members</p>
      </div>

      {users.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No family members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'PARENT'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{user.email}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>Points: {user.points}</span>
              </div>
              {isParent && user.role !== 'PARENT' && (
                <Button size="sm" variant="danger" onClick={() => handleDelete(user.id)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
