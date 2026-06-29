import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { NavBar } from '../components/NavBar'
import * as usersApi from '../api/users.api'

export function ProfilePage() {
  const { user } = useAuth()
  const { users, isLoading: usersLoading } = useUsers()
  const queryClient = useQueryClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [color, setColor] = useState(user?.color ?? '#4F46E5')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [colorError, setColorError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [colorSuccess, setColorSuccess] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingColor, setIsUpdatingColor] = useState(false)

  useEffect(() => {
    if (user?.color) setColor(user.color)
  }, [user?.color])

  useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordSuccess])

  useEffect(() => {
    if (colorSuccess) {
      const timer = setTimeout(() => setColorSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [colorSuccess])

  // Find current user in users list to get email
  const currentUserFull = users.find((u) => u.id === user?.id)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setIsUpdatingPassword(true)
    try {
      await usersApi.updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setPasswordSuccess('Password updated!')
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error?.message ?? 'Failed to update password.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  async function handleColorChange(e: React.FormEvent) {
    e.preventDefault()
    setColorError(null)
    setIsUpdatingColor(true)
    try {
      await usersApi.updateColor(color)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setColorSuccess('Color updated!')
    } catch (err: any) {
      setColorError(err?.response?.data?.error?.message ?? 'Failed to update color.')
    } finally {
      setIsUpdatingColor(false)
    }
  }

  if (usersLoading && !currentUserFull) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Profile</h2>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-full" style={{ backgroundColor: user?.color ?? '#4F46E5' }} />
            <div>
              <div className="text-lg font-bold text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-600">{currentUserFull ? (currentUserFull as any).email : ''}</div>
              <div className="text-xs text-gray-500">Role: {user?.role}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label htmlFor="current-password" className="block text-sm font-normal text-gray-700 mb-1">Current password</label>
              <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-normal text-gray-700 mb-1">New password (min 6)</label>
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-normal text-gray-700 mb-1">Confirm new password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" />
            </div>
            {passwordError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{passwordError}</div>}
            <button type="submit" disabled={isUpdatingPassword} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Display Color</h3>
          <p className="text-sm text-gray-600 mb-4">Choose a color to identify yourself across the app.</p>
          <form onSubmit={handleColorChange} className="space-y-3">
            <div>
              <label htmlFor="profile-color" className="block text-sm font-normal text-gray-700 mb-1">Color</label>
              <input id="profile-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 border rounded-lg" />
            </div>
            {colorError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{colorError}</div>}
            <button type="submit" disabled={isUpdatingColor} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {isUpdatingColor ? 'Updating...' : 'Update Color'}
            </button>
          </form>
        </div>
      </main>

      {passwordSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {passwordSuccess}
        </div>
      )}
      {colorSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {colorSuccess}
        </div>
      )}
    </div>
  )
}
