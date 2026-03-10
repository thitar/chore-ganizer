import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useUsers } from '../hooks'
import { Button, Modal } from '../components/common'
import { UserTable, UserForm, ConfirmDialog } from '../components/users'
import type { User, CreateUserData, UpdateUserData } from '../types'

export const Users: React.FC = () => {
  const { isParent } = useAuth()
  const { users, loading, error, createUser, updateUser, deleteUser, lockUser, unlockUser, refresh } = useUsers()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleEdit = (user: User) => {
    setEditingUser(user)
  }

  const handleEditSubmit = async (data: CreateUserData | UpdateUserData) => {
    if (!editingUser) return
    setIsSubmitting(true)
    try {
      const result = await updateUser(editingUser.id, data as UpdateUserData)
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

  const handleCreateSubmit = async (data: CreateUserData | UpdateUserData) => {
    setIsSubmitting(true)
    try {
      const result = await createUser(data as CreateUserData)
      if (result.success) {
        setSuccessMessage('User created successfully')
        setShowCreateModal(false)
        refresh()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(result.error || 'Failed to create user')
      }
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsSubmitting(true)
    try {
      const result = await deleteUser(userToDelete.id)
      if (result.success) {
        setSuccessMessage('User deleted successfully')
        refresh()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(result.error || 'Failed to delete user')
      }
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleLock = async (user: User) => {
    setIsSubmitting(true)
    try {
      await lockUser(user.id)
      setSuccessMessage('User locked successfully')
      refresh()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to lock user')
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleUnlock = async (user: User) => {
    setIsSubmitting(true)
    try {
      await unlockUser(user.id)
      setSuccessMessage('User unlocked successfully')
      refresh()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unlock user')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Members</h1>
          <p className="text-gray-600">Manage your family members</p>
        </div>
        {isParent && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Button>
        )}
      </div>

      {/* Messages */}
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

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <UserTable
          users={users}
          onEdit={isParent ? handleEdit : undefined}
          onDelete={isParent ? handleDeleteClick : undefined}
          onLock={isParent ? handleLock : undefined}
          onUnlock={isParent ? handleUnlock : undefined}
          loading={loading}
        />
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit Family Member"
      >
        {editingUser && (
          <UserForm
            user={editingUser}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingUser(null)}
            loading={isSubmitting}
          />
        )}
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New User"
      >
        <UserForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          loading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setUserToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isSubmitting}
      />
    </div>
  )
}

export default Users
