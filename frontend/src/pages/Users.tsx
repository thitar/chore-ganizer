import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useUsers } from '../hooks'
import { Button, Modal, ErrorDisplay } from '../components/common'
import { UserTable, UserForm, ConfirmDialog } from '../components/users'
import { showSuccess, showError } from '../utils/toast'
import type { User, CreateUserData, UpdateUserData } from '../types'

export const Users: React.FC = () => {
  const { isParent } = useAuth()
  const { users, loading, error, createUser, updateUser, deleteUser, lockUser, unlockUser, refresh } = useUsers()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (user: User) => {
    setEditingUser(user)
  }

  const handleEditSubmit = async (data: CreateUserData | UpdateUserData) => {
    if (!editingUser) return
    setIsSubmitting(true)
    try {
      const result = await updateUser(editingUser.id, data as UpdateUserData)
      if (result.success) {
        showSuccess('User updated successfully')
        setEditingUser(null)
        refresh()
      } else {
        showError(result.error || 'Failed to update user')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSubmit = async (data: CreateUserData | UpdateUserData) => {
    setIsSubmitting(true)
    try {
      const result = await createUser(data as CreateUserData)
      if (result.success) {
        showSuccess('User created successfully')
        setShowCreateModal(false)
        refresh()
      } else {
        showError(result.error || 'Failed to create user')
      }
    } finally {
      setIsSubmitting(false)
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
        showSuccess('User deleted successfully')
        refresh()
      } else {
        showError(result.error || 'Failed to delete user')
      }
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    }
  }

  const handleLock = async (user: User) => {
    setIsSubmitting(true)
    try {
      await lockUser(user.id)
      showSuccess('User locked successfully')
      refresh()
    } catch (err: any) {
      showError(err.message || 'Failed to lock user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnlock = async (user: User) => {
    setIsSubmitting(true)
    try {
      await unlockUser(user.id)
      showSuccess('User unlocked successfully')
      refresh()
    } catch (err: any) {
      showError(err.message || 'Failed to unlock user')
    } finally {
      setIsSubmitting(false)
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
      <div className="p-6">
        <ErrorDisplay
          title="Unable to Load Users"
          message={error}
          onRetry={refresh}
        />
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
