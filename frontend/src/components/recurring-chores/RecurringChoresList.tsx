import React from 'react'
import type { RecurringChore, Frequency, AssignmentMode } from '../../types/recurring-chores'

interface RecurringChoresListProps {
  recurringChores: RecurringChore[]
  onEdit: (recurringChore: RecurringChore) => void
  onDelete: (recurringChore: RecurringChore) => void
  isLoading?: boolean
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function generateRecurrencePreview(chore: RecurringChore): string {
  const { frequency, interval, dayOfWeek, dayOfMonth, nthWeekday } = chore.recurrenceRule
  const startDate = new Date(chore.startDate)

  switch (frequency) {
    case 'DAILY':
      return interval === 1 ? 'Every day' : `Every ${interval} days`

    case 'WEEKLY': {
      const daysText = dayOfWeek && dayOfWeek.length > 0
        ? dayOfWeek.sort((a, b) => a - b).map(d => DAYS_OF_WEEK[d]).join(', ')
        : 'no days'
      return interval === 1 ? `Weekly on ${daysText}` : `Every ${interval} weeks on ${daysText}`
    }

    case 'MONTHLY': {
      if (nthWeekday) {
        const weekLabels = ['First', 'Second', 'Third', 'Fourth', 'Fifth']
        const weekLabel = weekLabels[nthWeekday.week - 1] || 'First'
        const dayLabel = DAYS_OF_WEEK[nthWeekday.day]
        return interval === 1
          ? `${weekLabel} ${dayLabel} of each month`
          : `${weekLabel} ${dayLabel} every ${interval} months`
      }
      const day = dayOfMonth || startDate.getDate()
      return interval === 1
        ? `On the ${getOrdinal(day)} of each month`
        : `On the ${getOrdinal(day)} every ${interval} months`
    }

    case 'YEARLY': {
      const month = MONTHS[startDate.getMonth()]
      const day = dayOfMonth || startDate.getDate()
      return interval === 1
        ? `Yearly on ${month} ${getOrdinal(day)}`
        : `Every ${interval} years on ${month} ${getOrdinal(day)}`
    }

    default:
      return 'Unknown schedule'
  }
}

function getAssignmentPreview(chore: RecurringChore): string {
  const { assignmentMode, fixedAssignees, roundRobinPool } = chore

  const fixedNames = fixedAssignees.map(u => u.name)
  const poolNames = roundRobinPool.map(m => m.user.name)

  switch (assignmentMode) {
    case 'FIXED':
      return fixedNames.length > 0 ? fixedNames.join(', ') : 'No one assigned'

    case 'ROUND_ROBIN':
      return poolNames.length > 0
        ? `Rotation: ${poolNames.join(' → ')}`
        : 'No rotation set'

    case 'MIXED': {
      const parts: string[] = []
      if (fixedNames.length > 0) {
        parts.push(`Fixed: ${fixedNames.join(', ')}`)
      }
      if (poolNames.length > 0) {
        parts.push(`Rotation: ${poolNames.join(' → ')}`)
      }
      return parts.length > 0 ? parts.join(' | ') : 'No one assigned'
    }

    default:
      return 'Unknown assignment'
  }
}

function getAssignmentModeLabel(mode: AssignmentMode): string {
  switch (mode) {
    case 'FIXED':
      return 'Fixed'
    case 'ROUND_ROBIN':
      return 'Round Robin'
    case 'MIXED':
      return 'Mixed'
    default:
      return 'Unknown'
  }
}

function RecurringChoreSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50/50 rounded-b-lg border-t border-gray-200">
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No recurring chores</h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by creating a new recurring chore.
      </p>
    </div>
  )
}

export function RecurringChoresList({
  recurringChores,
  onEdit,
  onDelete,
  isLoading = false,
}: RecurringChoresListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <RecurringChoreSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (recurringChores.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {recurringChores.map((chore) => (
        <div
          key={chore.id}
          className={`rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${
            chore.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {chore.title}
                </h3>
                {chore.category && (
                  <span
                    className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: chore.category.color ? `${chore.category.color}20` : '#e5e7eb',
                      color: chore.category.color || '#4b5563',
                    }}
                  >
                    {chore.category.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {chore.points} pts
                </span>
                {!chore.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Recurrence */}
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-gray-600">{generateRecurrencePreview(chore)}</span>
            </div>

            {/* Assignment */}
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {getAssignmentModeLabel(chore.assignmentMode)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{getAssignmentPreview(chore)}</p>
              </div>
            </div>

            {/* Start date */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-600">
                Starts {new Date(chore.startDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 bg-gray-50/50 rounded-b-lg border-t border-gray-200 flex gap-2">
            <button
              onClick={() => onEdit(chore)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => onDelete(chore)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
