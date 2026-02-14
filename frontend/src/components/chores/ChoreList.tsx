import React from 'react'
import type { ChoreAssignment, User } from '../../types'
import { ChoreCard } from './ChoreCard'
import { Loading } from '../common'

interface ChoreListProps {
  chores: ChoreAssignment[]
  loading: boolean
  error: string | null
  onComplete: (id: number) => void
  onEdit: (assignment: ChoreAssignment) => void
  onDelete: (id: number) => void
  canEdit: boolean
  canComplete: boolean
  currentUser: User | null
}

export const ChoreList: React.FC<ChoreListProps> = ({
  chores,
  loading,
  error,
  onComplete,
  onEdit,
  onDelete,
  canEdit,
  canComplete,
  currentUser,
}) => {
  if (loading) {
    return <Loading text="Loading chores..." />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (chores.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No chores found. Create your first chore!</p>
      </div>
    )
  }

  // Filter chores based on user role
  const filteredChores = chores.filter((chore) => {
    if (canEdit) return true // Parents can see all chores
    return chore.assignedToId === currentUser?.id // Children only see their own chores
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredChores.map((chore) => (
        <ChoreCard
          key={chore.id}
          chore={chore}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canComplete={canComplete && chore.assignedToId === currentUser?.id}
        />
      ))}
    </div>
  )
}
