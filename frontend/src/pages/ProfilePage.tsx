import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { NavBar } from '../components/NavBar'
import * as usersApi from '../api/users.api'

function generateRandomTopic(username: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `chore-${username.toLowerCase()}-${suffix}`
}

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

  // Topic state
  const [topicEdit, setTopicEdit] = useState(false)
  const [topicValue, setTopicValue] = useState('')
  const [topicError, setTopicError] = useState<string | null>(null)
  const [topicSuccess, setTopicSuccess] = useState<string | null>(null)
  const [isUpdatingTopic, setIsUpdatingTopic] = useState(false)

  // Family topic edit state: userId -> edit mode
  const [familyEditMap, setFamilyEditMap] = useState<Record<number, boolean>>({})
  const [familyValueMap, setFamilyValueMap] = useState<Record<number, string>>({})
  const [familyErrorMap, setFamilyErrorMap] = useState<Record<number, string | null>>({})
  const [familyUpdatingMap, setFamilyUpdatingMap] = useState<Record<number, boolean>>({})

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

  useEffect(() => {
    if (topicSuccess) {
      const timer = setTimeout(() => setTopicSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [topicSuccess])

  // Find current user in users list to get email
  const currentUserFull = users.find((u) => u.id === user?.id)
  const ownTopic = currentUserFull?.ntfyTopic ?? null

  // Family members (exclude current user)
  const familyMembers = users.filter((u) => u.id !== user?.id)

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

  async function handleTopicSave() {
    setTopicError(null)
    setIsUpdatingTopic(true)
    try {
      await usersApi.updateNtfyTopic(topicValue || null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setTopicEdit(false)
      setTopicSuccess('Topic saved!')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setTopicError('This topic is already in use. Please choose another.')
      } else {
        setTopicError(err?.response?.data?.error?.message ?? 'Failed to update topic.')
      }
    } finally {
      setIsUpdatingTopic(false)
    }
  }

  async function handleFamilyTopicSave(userId: number) {
    setFamilyErrorMap((prev) => ({ ...prev, [userId]: null }))
    setFamilyUpdatingMap((prev) => ({ ...prev, [userId]: true }))
    try {
      const value = familyValueMap[userId] || null
      await usersApi.updateNtfyTopic(value)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setFamilyEditMap((prev) => ({ ...prev, [userId]: false }))
      setTopicSuccess('Topic saved!')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setFamilyErrorMap((prev) => ({ ...prev, [userId]: 'This topic is already in use. Please choose another.' }))
      } else {
        setFamilyErrorMap((prev) => ({ ...prev, [userId]: err?.response?.data?.error?.message ?? 'Failed to update topic.' }))
      }
    } finally {
      setFamilyUpdatingMap((prev) => ({ ...prev, [userId]: false }))
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

        {/* User Info */}
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

        {/* Change Password */}
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

        {/* Display Color */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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

        {/* Push Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Push Notifications</h3>
          <p className="text-sm text-gray-600 mb-4">Set your ntfy topic to receive push notifications when chores are assigned or due.</p>

          {!topicEdit ? (
            /* View mode */
            ownTopic ? (
              <div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-mono">{ownTopic}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setTopicValue(ownTopic); setTopicEdit(true); setTopicError(null); }}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Empty state */
              <div>
                <p className="text-sm text-gray-500 mb-3">Topic required for notifications</p>
                <button
                  type="button"
                  onClick={() => {
                    const topic = generateRandomTopic(user?.name ?? 'user')
                    setTopicValue(topic)
                    setTopicEdit(true)
                    setTopicError(null)
                  }}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                >
                  Generate random topic
                </button>
              </div>
            )
          ) : (
            /* Edit mode */
            <div className="space-y-3">
              <div>
                <label htmlFor="topic-input" className="block text-sm font-normal text-gray-700 mb-1">Topic</label>
                <input
                  id="topic-input"
                  type="text"
                  value={topicValue}
                  onChange={(e) => setTopicValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const topic = generateRandomTopic(user?.name ?? 'user')
                    setTopicValue(topic)
                  }}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                >
                  Generate random topic
                </button>
              </div>
              {topicError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{topicError}</div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTopicSave}
                  disabled={isUpdatingTopic}
                  className="bg-indigo-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUpdatingTopic ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTopicEdit(false); setTopicError(null); }}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Family Topics (Parent only) */}
        {user?.role === 'PARENT' && familyMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Family Topics</h3>
            <div className="space-y-3">
              {familyMembers.map((member) => {
                const isEditing = familyEditMap[member.id] ?? false
                const editValue = familyValueMap[member.id] ?? member.ntfyTopic ?? ''
                const editError = familyErrorMap[member.id] ?? null
                const isSaving = familyUpdatingMap[member.id] ?? false

                return (
                  <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </div>

                    {!isEditing ? (
                      /* View mode */
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-mono">
                          {member.ntfyTopic ?? 'Not set'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFamilyEditMap((prev) => ({ ...prev, [member.id]: true }))
                            setFamilyValueMap((prev) => ({ ...prev, [member.id]: member.ntfyTopic ?? '' }))
                            setFamilyErrorMap((prev) => ({ ...prev, [member.id]: null }))
                          }}
                          className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setFamilyValueMap((prev) => ({ ...prev, [member.id]: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const topic = generateRandomTopic(member.name)
                              setFamilyValueMap((prev) => ({ ...prev, [member.id]: topic }))
                            }}
                            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                          >
                            Generate random topic
                          </button>
                        </div>
                        {editError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{editError}</div>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleFamilyTopicSave(member.id)}
                            disabled={isSaving}
                            className="bg-indigo-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFamilyEditMap((prev) => ({ ...prev, [member.id]: false }))
                              setFamilyErrorMap((prev) => ({ ...prev, [member.id]: null }))
                            }}
                            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 min-h-[44px] rounded-lg text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
      {topicSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {topicSuccess}
        </div>
      )}
    </div>
  )
}
