import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { useGamification } from '../hooks/usePoints'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { BadgeGrid } from '../components/BadgeGrid'
import { Toast } from '../components/ui/Toast'
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
  const { data: gamification } = useGamification()
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
      await usersApi.updateUserNtfyTopic(userId, value)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setFamilyEditMap((prev) => ({ ...prev, [userId]: false }))
      setTopicSuccess('Family member topic saved!')
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
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-accent" />
          <span className="ml-3 text-zinc-400">Loading profile...</span>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Profile" />

        {/* Identity header */}
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user?.name ?? ''} color={user?.color ?? '#4F46E5'} size="lg" />
          <div>
            <p className="font-display text-xl font-bold text-zinc-100">{user?.name}</p>
            <p className="text-sm text-zinc-400">{currentUserFull?.email ?? ''}</p>
            <p className="text-xs text-zinc-500">Role: {user?.role}</p>
          </div>
        </div>

        {/* Change Password */}
        <Card className="p-6 mb-6">
          <h3 className="mb-4 font-display text-lg font-bold text-zinc-100">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label htmlFor="current-password" className="mb-1 block text-sm font-normal text-zinc-300">Current password</label>
              <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-normal text-zinc-300">New password (min 6)</label>
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-normal text-zinc-300">Confirm new password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
            </div>
            {passwordError && <div className="alert-error">{passwordError}</div>}
            <Button type="submit" loading={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>

        {/* Display Color */}
        <Card className="p-6 mb-6">
          <h3 className="mb-4 font-display text-lg font-bold text-zinc-100">Display Color</h3>
          <p className="mb-4 text-sm text-zinc-400">Choose a color to identify yourself across the app.</p>
          <form onSubmit={handleColorChange} className="space-y-3">
            <div>
              <label htmlFor="profile-color" className="mb-1 block text-sm font-normal text-zinc-300">Color</label>
              <input id="profile-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg border border-edge" />
            </div>
            {colorError && <div className="alert-error">{colorError}</div>}
            <Button type="submit" loading={isUpdatingColor}>
              {isUpdatingColor ? 'Updating...' : 'Update Color'}
            </Button>
          </form>
        </Card>

        {/* Badges */}
        <Card className="p-6 mb-6">
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Badges</h3>
          {gamification ? (
            <BadgeGrid badges={gamification.badges} />
          ) : (
            <p className="text-sm text-zinc-500">Loading badges…</p>
          )}
        </Card>

        {/* Push Notifications */}
        <Card className="p-6 mb-6">
          <h3 className="mb-2 font-display text-lg font-bold text-zinc-100">Push Notifications</h3>
          <p className="mb-4 text-sm text-zinc-400">Set your ntfy topic to receive push notifications when chores are assigned or due.</p>

          {!topicEdit ? (
            /* View mode */
            ownTopic ? (
              <div>
                <div className="mb-2 text-sm text-zinc-300">
                  <span className="font-mono">{ownTopic}</span>
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setTopicValue(ownTopic); setTopicEdit(true); setTopicError(null); }}
                >
                  Change
                </Button>
              </div>
            ) : (
              /* Empty state - show input directly */
              <div className="space-y-3">
                <div>
                  <label htmlFor="topic-input" className="mb-1 block text-sm font-normal text-zinc-300">Topic</label>
                  <input
                    id="topic-input"
                    type="text"
                    value={topicValue}
                    onChange={(e) => setTopicValue(e.target.value)}
                    placeholder="Enter your topic or generate one below"
                    className="input font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      const topic = generateRandomTopic(user?.name ?? 'user')
                      setTopicValue(topic)
                    }}
                  >
                    Generate random topic
                  </Button>
                </div>
                {topicError && <div className="alert-error">{topicError}</div>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleTopicSave}
                    disabled={isUpdatingTopic || !topicValue.trim()}
                    loading={isUpdatingTopic}
                  >
                    {isUpdatingTopic ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )
          ) : (
            /* Edit mode */
            <div className="space-y-3">
              <div>
                <label htmlFor="topic-input" className="mb-1 block text-sm font-normal text-zinc-300">Topic</label>
                <input
                  id="topic-input"
                  type="text"
                  value={topicValue}
                  onChange={(e) => setTopicValue(e.target.value)}
                  className="input font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    const topic = generateRandomTopic(user?.name ?? 'user')
                    setTopicValue(topic)
                  }}
                >
                  Generate random topic
                </Button>
              </div>
              {topicError && <div className="alert-error">{topicError}</div>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleTopicSave}
                  disabled={isUpdatingTopic}
                  loading={isUpdatingTopic}
                >
                  {isUpdatingTopic ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setTopicEdit(false); setTopicError(null); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Family Topics (Parent only) */}
        {user?.role === 'PARENT' && familyMembers.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="mb-4 font-display text-lg font-bold text-zinc-100">Family Topics</h3>
            <div className="space-y-3">
              {familyMembers.map((member) => {
                const isEditing = familyEditMap[member.id] ?? false
                const editValue = familyValueMap[member.id] ?? member.ntfyTopic ?? ''
                const editError = familyErrorMap[member.id] ?? null
                const isSaving = familyUpdatingMap[member.id] ?? false

                return (
                  <div key={member.id} className="rounded-xl bg-white/5 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-zinc-100">{member.name}</span>
                    </div>

                    {!isEditing ? (
                      /* View mode */
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-zinc-400">
                          {member.ntfyTopic ?? 'Not set'}
                        </span>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            setFamilyEditMap((prev) => ({ ...prev, [member.id]: true }))
                            setFamilyValueMap((prev) => ({ ...prev, [member.id]: member.ntfyTopic ?? '' }))
                            setFamilyErrorMap((prev) => ({ ...prev, [member.id]: null }))
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    ) : (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setFamilyValueMap((prev) => ({ ...prev, [member.id]: e.target.value }))}
                            className="input font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              const topic = generateRandomTopic(member.name)
                              setFamilyValueMap((prev) => ({ ...prev, [member.id]: topic }))
                            }}
                          >
                            Generate random topic
                          </Button>
                        </div>
                        {editError && <div className="alert-error">{editError}</div>}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => handleFamilyTopicSave(member.id)}
                            disabled={isSaving}
                            loading={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              setFamilyEditMap((prev) => ({ ...prev, [member.id]: false }))
                              setFamilyErrorMap((prev) => ({ ...prev, [member.id]: null }))
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {passwordSuccess && <Toast kind="success">{passwordSuccess}</Toast>}
      {colorSuccess && <Toast kind="success">{colorSuccess}</Toast>}
      {topicSuccess && <Toast kind="success">{topicSuccess}</Toast>}
    </AppShell>
  )
}
