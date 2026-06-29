import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth, useUsers } from '../hooks'
import { Button, Loading } from '../components/common'
import { ColorPicker, ConfirmDialog } from '../components/users'
import type { User, CreateUserData, UpdateUserData } from '../types'

type TabType = 'overview' | 'assignments' | 'pocket-money'

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { isParent } = useAuth()
  const { users, updateUser, deleteUser, lockUser, unlockUser, refresh, parentCount } = useUsers()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLockConfirm, setShowLockConfirm] = useState(false)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBasePocketMoney, setEditBasePocketMoney] = useState('')
  const [editRole, setEditRole] = useState<'PARENT' | 'CHILD'>('CHILD')

  // Find user from the users list
  const user = users.find((u) => u.id === Number(id))

  // Helper function to check if user is locked
  const isUserLocked = (u: User): boolean => {
    if (!u.lockoutUntil) return false
    try {
      const lockoutDate = typeof u.lockoutUntil === 'string' 
        ? new Date(u.lockoutUntil) 
        : u.lockoutUntil
      return lockoutDate > new Date()
    } catch {
      return false
    }
  }

  // Helper function to safely format dates
  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return 'N/A'
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      return date.toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  const handleEditClick = () => {
    if (!user) return
    setEditName(user.name)
    setEditEmail(user.email)
    setEditColor(user.color || '#3B82F6')
    setEditBasePocketMoney(user.basePocketMoney?.toString() || '0')
    setEditRole(user.role)
    setIsEditing(true)
  }

  const handleEditSubmit = async () => {
    if (!user) return
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
      const data: UpdateUserData = {
        name: editName.trim(),
        email: editEmail.trim(),
        color: editColor,
        role: editRole,
        basePocketMoney: editRole === 'CHILD' ? parseFloat(editBasePocketMoney) || 0 : undefined,
      }
      const result = await updateUser(user.id, data)
      if (result.success) {
        setSuccessMessage('User updated successfully')
        setIsEditing(false)
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

  const handleDelete = async () => {
    if (!user) return
    const result = await deleteUser(user.id)
    if (result.success) {
      window.location.href = '/users'
    } else {
      setErrorMessage(result.error || 'Failed to delete user')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleLock = async () => {
    if (!user) return
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

  const handleUnlock = async () => {
    if (!user) return
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

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
        <Link to="/users" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Users
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'assignments' as TabType, label: 'Assignments' },
    { id: 'pocket-money' as TabType, label: 'Pocket Money' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/users"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: user.color || '#3B82F6' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>

        {isParent && !isEditing && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleEditClick}>
              Edit
            </Button>
            {user.role !== 'PARENT' && (
              <>
                {isUserLocked(user) ? (
                  <Button variant="primary" onClick={() => setShowUnlockConfirm(true)}>
                    Unlock
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setShowLockConfirm(true)}>
                    Lock
                  </Button>
                )}
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="CHILD"
                      checked={editRole === 'CHILD'}
                      onChange={(e) => setEditRole(e.target.value as 'CHILD')}
                      disabled={user.role === 'PARENT' && parentCount <= 1}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-2 text-sm text-gray-700">Child</span>
                    {user.role === 'PARENT' && parentCount <= 1 && (
                      <span className="ml-1 text-xs text-red-500">(last parent)</span>
                    )}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value="PARENT"
                      checked={editRole === 'PARENT'}
                      onChange={(e) => setEditRole(e.target.value as 'PARENT')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Parent</span>
                  </label>
                </div>
              </div>

              <ColorPicker
                label="Calendar Color"
                value={editColor}
                onChange={setEditColor}
                previewText={editName || 'User'}
              />

              {editRole === 'CHILD' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Pocket Money (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBasePocketMoney}
                    onChange={(e) => setEditBasePocketMoney(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleEditSubmit} loading={isSubmitting} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Role Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Role</h3>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    user.role === 'PARENT'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Points Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Points</h3>
                <p className="text-3xl font-bold text-gray-900">{user.points}</p>
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                {isUserLocked(user) ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                      Locked
                    </span>
                    {user.lockoutUntil && (
                      <span className="text-xs text-gray-500">
                        until {formatDate(user.lockoutUntil)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>

              {/* Color Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Calendar Color</h3>
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: user.color || '#3B82F6' }}
                  />
                  <span className="font-mono text-sm text-gray-600">{user.color || '#3B82F6'}</span>
                </div>
              </div>

              {/* Base Pocket Money Card */}
              {user.role === 'CHILD' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Base Pocket Money</h3>
                  <p className="text-3xl font-bold text-green-600">€{user.basePocketMoney.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">per month</p>
                </div>
              )}

              {/* Joined Date Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Member Since</h3>
                <p className="text-lg font-medium text-gray-900">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">
            Assignments view coming soon...
          </p>
        </div>
      )}

      {activeTab === 'pocket-money' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">
            Pocket money history coming soon...
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${user.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={isSubmitting}
      />

      {/* Lock Confirmation */}
      <ConfirmDialog
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={handleLock}
        title="Lock User"
        message={`Are you sure you want to lock ${user.name}? They will not be able to log in until unlocked.`}
        confirmText="Lock"
        variant="warning"
        loading={isSubmitting}
      />

      {/* Unlock Confirmation */}
      <ConfirmDialog
        isOpen={showUnlockConfirm}
        onClose={() => setShowUnlockConfirm(false)}
        onConfirm={handleUnlock}
        title="Unlock User"
        message={`Are you sure you want to unlock ${user.name}? They will be able to log in again.`}
        confirmText="Unlock"
        variant="info"
        loading={isSubmitting}
      />
    </div>
  )
}

export default UserDetail
