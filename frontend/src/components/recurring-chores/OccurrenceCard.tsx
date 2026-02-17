import type { ChoreOccurrence } from '../../types/recurring-chores'
import { 
  formatDueDate, 
  getStatusColorClasses, 
  formatTimestamp, 
  getUserInitials,
  canUserAct 
} from './occurrence-helpers'

interface OccurrenceCardProps {
  occurrence: ChoreOccurrence
  onComplete: (occurrence: ChoreOccurrence) => void
  onSkip: (occurrence: ChoreOccurrence) => void
  onUnskip: (occurrence: ChoreOccurrence) => void
  currentUserId: number
  isProcessing?: boolean
}

export function OccurrenceCard({
  occurrence,
  onComplete,
  onSkip,
  onUnskip,
  currentUserId,
  isProcessing = false
}: OccurrenceCardProps) {
  const { recurringChore, status, assignedUsers, completedBy, completedAt, skippedBy, skippedAt } = occurrence
  const colors = getStatusColorClasses(status)
  const canAct = canUserAct(occurrence, currentUserId)
  const isDisabled = isProcessing || !canAct

  return (
    <div 
      className={`
        rounded-lg border shadow-sm transition-all duration-200
        ${colors.bg} ${colors.border}
        ${isProcessing ? 'opacity-60' : 'hover:shadow-md'}
      `}
    >
      {/* Header with title and points */}
      <div className="p-4 border-b border-inherit">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {recurringChore.title}
            </h3>
            {recurringChore.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {recurringChore.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700">
              {recurringChore.points} pts
            </span>
          </div>
        </div>
      </div>

      {/* Body with due date and assigned users */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Due date */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{formatDueDate(occurrence.dueDate)}</span>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Assigned users */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Assigned:</span>
          <div className="flex items-center -space-x-2">
            {assignedUsers.map((user) => (
              <div
                key={user.id}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                title={user.name}
              >
                {getUserInitials(user.name)}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {assignedUsers.map(u => u.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Footer with actions or completion/skip info */}
      <div className="px-4 py-3 bg-gray-50/50 rounded-b-lg border-t border-inherit">
        {status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onComplete(occurrence)}
              disabled={isDisabled}
              className={`
                flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 
                text-sm font-medium rounded-md transition-colors
                ${isDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </button>
            <button
              onClick={() => onSkip(occurrence)}
              disabled={isDisabled}
              className={`
                flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 
                text-sm font-medium rounded-md transition-colors
                ${isDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Skip
            </button>
            {!canAct && (
              <span className="text-xs text-gray-400 italic ml-2">
                Not assigned
              </span>
            )}
          </div>
        )}

        {status === 'COMPLETED' && completedBy && completedAt && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Completed by <span className="font-medium">{completedBy.name}</span> at {formatTimestamp(completedAt)}
            </span>
          </div>
        )}

        {status === 'SKIPPED' && (
          <div className="flex items-center justify-between">
            {skippedBy && skippedAt && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span>
                  Skipped by <span className="font-medium">{skippedBy.name}</span> at {formatTimestamp(skippedAt)}
                </span>
              </div>
            )}
            <button
              onClick={() => onUnskip(occurrence)}
              disabled={isProcessing}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 
                text-sm font-medium rounded-md transition-colors
                ${isProcessing 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Unskip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}