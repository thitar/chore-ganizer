import { useMemo } from 'react'
import type { ChoreOccurrence } from '../../types/recurring-chores'
import { OccurrenceGroup } from './OccurrenceGroup'
import { groupOccurrencesByDate } from './occurrence-helpers'

interface OccurrenceListProps {
  occurrences: ChoreOccurrence[]
  onComplete: (occurrence: ChoreOccurrence) => void
  onSkip: (occurrence: ChoreOccurrence) => void
  onUnskip: (occurrence: ChoreOccurrence) => void
  currentUserId: number
  isLoading?: boolean
  filter?: 'all' | 'pending' | 'completed' | 'skipped'
  onFilterChange?: (filter: 'all' | 'pending' | 'completed' | 'skipped') => void
  processingId?: number | null
}

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'completed' as const, label: 'Completed' },
  { value: 'skipped' as const, label: 'Skipped' }
]

function OccurrenceSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gray-200"></div>
            <div className="w-7 h-7 rounded-full bg-gray-200"></div>
          </div>
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

function EmptyState({ filter }: { filter: 'all' | 'pending' | 'completed' | 'skipped' }) {
  const messages: Record<typeof filter, { title: string; description: string }> = {
    all: {
      title: 'No occurrences',
      description: 'There are no chore occurrences scheduled yet.'
    },
    pending: {
      title: 'No pending chores',
      description: 'All caught up! No pending chores to complete.'
    },
    completed: {
      title: 'No completed chores',
      description: 'No chores have been completed yet.'
    },
    skipped: {
      title: 'No skipped chores',
      description: 'No chores have been skipped.'
    }
  }

  const { title, description } = messages[filter]

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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

export function OccurrenceList({
  occurrences,
  onComplete,
  onSkip,
  onUnskip,
  currentUserId,
  isLoading = false,
  filter = 'all',
  onFilterChange,
  processingId = null
}: OccurrenceListProps) {
  // Filter occurrences based on selected filter
  const filteredOccurrences = useMemo(() => {
    if (filter === 'all') {
      return occurrences
    }
    return occurrences.filter((occ) => occ.status.toLowerCase() === filter)
  }, [occurrences, filter])

  // Group filtered occurrences by date
  const groupedOccurrences = useMemo(() => {
    return groupOccurrencesByDate(filteredOccurrences)
  }, [filteredOccurrences])

  // Count occurrences by status for filter badges
  const counts = useMemo(() => {
    return {
      all: occurrences.length,
      pending: occurrences.filter((o) => o.status === 'PENDING').length,
      completed: occurrences.filter((o) => o.status === 'COMPLETED').length,
      skipped: occurrences.filter((o) => o.status === 'SKIPPED').length
    }
  }, [occurrences])

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filter skeleton */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-md w-20 animate-pulse"></div>
          ))}
        </div>
        {/* Card skeletons */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <OccurrenceSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      {onFilterChange && (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
          {FILTER_OPTIONS.map((option) => {
            const count = counts[option.value]
            const isActive = filter === option.value

            return (
              <button
                key={option.value}
                onClick={() => onFilterChange(option.value)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }
                `}
              >
                {option.label}
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[1.25rem] h-5 
                    px-1.5 rounded-full text-xs font-medium
                    ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'}
                  `}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {filteredOccurrences.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        /* Grouped occurrence lists */
        <div className="mt-4">
          {['Today', 'Tomorrow', 'This Week', 'Later'].map((groupLabel) => {
            const groupOccurrences = groupedOccurrences.get(groupLabel) || []
            return (
              <OccurrenceGroup
                key={groupLabel}
                label={groupLabel}
                occurrences={groupOccurrences}
                onComplete={onComplete}
                onSkip={onSkip}
                onUnskip={onUnskip}
                currentUserId={currentUserId}
                isProcessing={processingId !== null}
                defaultCollapsed={groupLabel === 'Later'}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}