import React from 'react'
import { Button } from '../common'

interface ChoreFiltersProps {
  currentFilter: string
  onFilterChange: (filter: string) => void
}

export const ChoreFilters: React.FC<ChoreFiltersProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const filters = [
    { id: 'all', label: 'All Chores' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'COMPLETED', label: 'Completed' },
  ]

  return (
    <div className="flex gap-2 mb-4">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant={currentFilter === filter.id ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}
