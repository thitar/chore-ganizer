import React from 'react'
import { Loading, ErrorDisplay } from '../common'

interface NotificationSettings {
  ntfyTopic: string | null
  ntfyServerUrl: string | null
  notifyChoreAssigned: boolean
  notifyChoreDueSoon: boolean
  notifyChoreCompleted: boolean
  notifyChoreOverdue: boolean
  notifyPointsEarned: boolean
  reminderHoursBefore: number
}

interface NotifConfigData {
  settings: NotificationSettings
}

interface NotifConfigCardProps {
  data: NotifConfigData | null
  loading: boolean
  error: string | null
}

const Badge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
      active
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-500'
    }`}
  >
    {label}
  </span>
)

export const NotifConfigCard: React.FC<NotifConfigCardProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <Loading text="Loading notification config..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <ErrorDisplay message={error} />
      </div>
    )
  }

  if (!data || !data.settings) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Notification Config</h3>
        <p className="text-gray-500 text-sm">No notification config</p>
      </div>
    )
  }

  const { settings: s } = data

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Notification Config</h3>
      <div className="space-y-3">
        {/* ntfy channel */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">ntfy Channel</p>
          <p className="text-sm text-gray-900 font-mono">
            {s.ntfyTopic || <span className="text-gray-400 italic">Not configured</span>}
          </p>
          {s.ntfyServerUrl && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{s.ntfyServerUrl}</p>
          )}
        </div>

        {/* Notification preferences */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Notification Preferences</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge active={s.notifyChoreAssigned} label="Chore Assigned" />
            <Badge active={s.notifyChoreDueSoon} label="Due Soon" />
            <Badge active={s.notifyChoreCompleted} label="Completed" />
            <Badge active={s.notifyChoreOverdue} label="Overdue" />
            <Badge active={s.notifyPointsEarned} label="Points Earned" />
          </div>
        </div>

        {/* Reminder */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Reminder</p>
          <p className="text-sm text-gray-900">
            {s.reminderHoursBefore > 0
              ? `${s.reminderHoursBefore} hour${s.reminderHoursBefore !== 1 ? 's' : ''} before`
              : 'No reminder'}
          </p>
        </div>
      </div>
    </div>
  )
}
