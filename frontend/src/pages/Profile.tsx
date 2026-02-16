import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks'
import { Loading } from '../components/common'
import { notificationSettingsApi, NotificationSettings, UpdateNotificationSettingsData } from '../api/notification-settings.api'

export const Profile: React.FC = () => {
  const { user, loading } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [ntfyServerUrl, setNtfyServerUrl] = useState('')
  const [ntfyTopic, setNtfyTopic] = useState('')
  const [ntfyUsername, setNtfyUsername] = useState('')
  const [ntfyPassword, setNtfyPassword] = useState('')
  const [notifyChoreAssigned, setNotifyChoreAssigned] = useState(true)
  const [notifyChoreDueSoon, setNotifyChoreDueSoon] = useState(true)
  const [notifyChoreCompleted, setNotifyChoreCompleted] = useState(true)
  const [notifyChoreOverdue, setNotifyChoreOverdue] = useState(true)
  const [notifyPointsEarned, setNotifyPointsEarned] = useState(true)
  const [reminderHoursBefore, setReminderHoursBefore] = useState(2)
  const [quietHoursStart, setQuietHoursStart] = useState<number | null>(null)
  const [quietHoursEnd, setQuietHoursEnd] = useState<number | null>(null)
  // Overdue penalty settings
  const [overduePenaltyEnabled, setOverduePenaltyEnabled] = useState(true)
  const [overduePenaltyMultiplier, setOverduePenaltyMultiplier] = useState(2)
  const [notifyParentOnOverdue, setNotifyParentOnOverdue] = useState(true)

  useEffect(() => {
    if (!loading && user) {
      loadSettings()
    }
  }, [loading, user])

  const loadSettings = async () => {
    try {
      setSettingsLoading(true)
      setError(null)
      const data = await notificationSettingsApi.get()
      setSettings(data)
      
      // Populate form state
      setNtfyServerUrl(data.ntfyServerUrl || 'https://ntfy.sh')
      setNtfyTopic(data.ntfyTopic || '')
      setNtfyUsername(data.ntfyUsername || '')
      setNtfyPassword(data.ntfyPassword || '')
      setNotifyChoreAssigned(data.notifyChoreAssigned)
      setNotifyChoreDueSoon(data.notifyChoreDueSoon)
      setNotifyChoreCompleted(data.notifyChoreCompleted)
      setNotifyChoreOverdue(data.notifyChoreOverdue)
      setNotifyPointsEarned(data.notifyPointsEarned)
      setReminderHoursBefore(data.reminderHoursBefore)
      setQuietHoursStart(data.quietHoursStart)
      setQuietHoursEnd(data.quietHoursEnd)
      // Overdue penalty settings
      setOverduePenaltyEnabled(data.overduePenaltyEnabled)
      setOverduePenaltyMultiplier(data.overduePenaltyMultiplier)
      setNotifyParentOnOverdue(data.notifyParentOnOverdue)
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load notification settings')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const updateData: UpdateNotificationSettingsData = {
        ntfyServerUrl: ntfyServerUrl.trim() || 'https://ntfy.sh',
        ntfyTopic: ntfyTopic.trim() || null,
        ntfyUsername: ntfyUsername.trim() || null,
        ntfyPassword: ntfyPassword.trim() || null,
        notifyChoreAssigned,
        notifyChoreDueSoon,
        notifyChoreCompleted,
        notifyChoreOverdue,
        notifyPointsEarned,
        reminderHoursBefore,
        quietHoursStart,
        quietHoursEnd,
        // Overdue penalty settings (only for parents)
        ...(user?.role === 'PARENT' && {
          overduePenaltyEnabled,
          overduePenaltyMultiplier,
          notifyParentOnOverdue,
        }),
      }

      const updated = await notificationSettingsApi.update(updateData)
      setSettings(updated)
      setSuccess('Notification settings saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    if (!ntfyTopic.trim()) {
      setError('Please enter a ntfy topic before sending a test notification')
      return
    }

    try {
      setTesting(true)
      setError(null)
      setSuccess(null)

      const result = await notificationSettingsApi.sendTest()
      
      if (result.success) {
        setSuccess('Test notification sent successfully! Check your ntfy app.')
      } else {
        setError(result.message || 'Failed to send test notification')
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  if (loading || settingsLoading) {
    return <Loading text="Loading profile..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">View your profile and notification settings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* User Info Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-2xl font-bold text-blue-600">{user?.points || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Member Since</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings Section */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
          <p className="text-sm text-gray-600">Configure ntfy push notifications for your device</p>
        </div>

        {/* ntfy Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ntfy Server URL
              </label>
              <input
                type="url"
                value={ntfyServerUrl}
                onChange={(e) => setNtfyServerUrl(e.target.value)}
                placeholder="https://ntfy.sh"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default is https://ntfy.sh
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ntfy Topic
              </label>
              <input
                type="text"
                value={ntfyTopic}
                onChange={(e) => setNtfyTopic(e.target.value)}
                placeholder="my-unique-topic"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Subscribe to this topic in your ntfy app
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (optional)
              </label>
              <input
                type="text"
                value={ntfyUsername}
                onChange={(e) => setNtfyUsername(e.target.value)}
                placeholder="ntfy username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                For ntfy servers requiring authentication
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (optional)
              </label>
              <input
                type="password"
                value={ntfyPassword}
                onChange={(e) => setNtfyPassword(e.target.value)}
                placeholder="ntfy password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                For ntfy servers requiring authentication
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTestNotification}
              disabled={testing || !ntfyTopic.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>

        {/* Notification Types */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Notification Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyChoreAssigned}
                onChange={(e) => setNotifyChoreAssigned(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Chore assigned to me</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyChoreDueSoon}
                onChange={(e) => setNotifyChoreDueSoon(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Chore due soon</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyChoreCompleted}
                onChange={(e) => setNotifyChoreCompleted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Chore completed</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyChoreOverdue}
                onChange={(e) => setNotifyChoreOverdue(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Chore overdue</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyPointsEarned}
                onChange={(e) => setNotifyPointsEarned(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Points earned</span>
            </label>
          </div>
        </div>

        {/* Reminder & Quiet Hours */}
        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder (hours before)
              </label>
              <select
                value={reminderHoursBefore}
                onChange={(e) => setReminderHoursBefore(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quiet Hours Start
              </label>
              <select
                value={quietHoursStart ?? ''}
                onChange={(e) => setQuietHoursStart(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Disabled</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quiet Hours End
              </label>
              <select
                value={quietHoursEnd ?? ''}
                onChange={(e) => setQuietHoursEnd(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Disabled</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Overdue Penalty Settings - Parents Only */}
        {user?.role === 'PARENT' && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Overdue Penalty Settings</h3>
            <p className="text-xs text-gray-600 mb-4">
              Configure penalties for overdue chores. When a chore becomes overdue, points will be deducted from the assigned user.
            </p>
            
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overduePenaltyEnabled}
                  onChange={(e) => setOverduePenaltyEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable overdue penalties</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Penalty Multiplier
                  </label>
                  <select
                    value={overduePenaltyMultiplier}
                    onChange={(e) => setOverduePenaltyMultiplier(parseInt(e.target.value))}
                    disabled={!overduePenaltyEnabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value={1}>1x (1 × chore points)</option>
                    <option value={2}>2x (2 × chore points)</option>
                    <option value={3}>3x (3 × chore points)</option>
                    <option value={4}>4x (4 × chore points)</option>
                    <option value={5}>5x (5 × chore points)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Penalty = -multiplier × chore points
                  </p>
                </div>

                <div className="flex items-start pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyParentOnOverdue}
                      onChange={(e) => setNotifyParentOnOverdue(e.target.checked)}
                      disabled={!overduePenaltyEnabled}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700">Notify me when chores become overdue</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How to set up ntfy</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Download the ntfy app on your phone (iOS/Android)</li>
          <li>Choose a unique topic name and subscribe to it in the app</li>
          <li>Enter the topic name above and save settings</li>
          <li>Send a test notification to verify</li>
        </ol>
      </div>
    </div>
  )
}
