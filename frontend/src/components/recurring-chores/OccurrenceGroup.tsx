import { useState } from 'react'
import type { ChoreOccurrence } from '../../types/recurring-chores'
import { OccurrenceCard } from './OccurrenceCard'

interface OccurrenceGroupProps {
  label: string
  occurrences: ChoreOccurrence[]
  onComplete: (occurrence: ChoreOccurrence) => void
  onSkip: (occurrence: ChoreOccurrence) => void
  onUnskip: (occurrence: ChoreOccurrence) => void
  currentUserId: number
  isProcessing?: boolean
  defaultCollapsed?: boolean
}

export function OccurrenceGroup({
  label,
  occurrences,
  onComplete,
  onSkip,
  onUnskip,
  currentUserId,
  isProcessing = false,
  defaultCollapsed = false
}: OccurrenceGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  if (occurrences.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      {/* Group header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {occurrences.length}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Occurrence cards */}
      <div
        className={`mt-2 grid gap-4 transition-all duration-200 overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
        }`}
      >
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {occurrences.map((occurrence) => (
            <OccurrenceCard
              key={occurrence.id}
              occurrence={occurrence}
              onComplete={onComplete}
              onSkip={onSkip}
              onUnskip={onUnskip}
              currentUserId={currentUserId}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </div>
    </div>
  )
}