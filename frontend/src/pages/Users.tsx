import React, { useState } from 'react'
import { useAuth, useUsers } from '../hooks'
import { Button, Modal } from '../components/common'
import type { User } from '../types'

export const Users: React.FC = () => {
  const { isParent } = useAuth()
  const { users, loading, error, deleteUser, updateUser, refresh } = useUsers()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editColor, setEditColor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    const result = await deleteUser(id)
    if (result.success) {
      setSuccessMessage('User deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setErrorMessage(result.error || 'Failed to delete user')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditColor(user.color || '#3B82F6')
  }

  const handleEditSubmit = async () => {
    if (!editingUser) return
    if (!editName.trim()) {
      setErrorMessage('Name is required')
      return
    }
    if (!editEmail.trim()) {
      setErrorMessage('Email is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        color: editColor,
      })
      if (result.success) {
        setSuccessMessage('User updated successfully')
        setEditingUser(null)
        refresh()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(result.error || 'Failed to update user')
      }
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setErrorMessage(null), 3000)
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
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Family Members</h1>
        <p className="text-gray-600">Manage your family members</p>
        {isParent && <p className="text-sm text-gray-500 mt-1">Click on a family member to edit their details</p>}
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
              className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${isParent ? 'cursor-pointer' : ''}`}
              onClick={() => isParent && handleEditClick(user)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: user.color || '#3B82F6' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'PARENT'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">{user.email}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>Points: {user.points}</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color || '#3B82F6' }}></span>
                  <span className="text-xs">Color</span>
                </div>
              </div>
              {isParent && user.role !== 'PARENT' && (
                <div className="pt-2 border-t border-gray-100">
                  <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(user.id)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Family Member"
      >
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Preview:</p>
              <div
                className="mt-1 h-8 rounded-lg flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: editColor }}
              >
                {editName || 'User Name'}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={isSubmitting || !editName.trim() || !editEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
