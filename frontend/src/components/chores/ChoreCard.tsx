import React from 'react'
import type { Chore } from '../../types'
import { Button } from '../common'

interface ChoreCardProps {
  chore: Chore
  onComplete: (id: number) => void
  onEdit: (chore: Chore) => void
  onDelete: (id: number) => void
  canEdit: boolean
  canComplete: boolean
}

export const ChoreCard: React.FC<ChoreCardProps> = ({
  chore,
  onComplete,
  onEdit,
  onDelete,
  canEdit,
  canComplete,
}) => {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{chore.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[chore.status]}`}>
          {chore.status}
        </span>
      </div>
      {chore.description && (
        <p className="text-gray-600 text-sm mb-3">{chore.description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <span>Assigned to: {chore.assignedTo.name}</span>
        <span className="font-semibold text-blue-600">{chore.points} pts</span>
      </div>
      <div className="flex gap-2">
        {canComplete && chore.status === 'PENDING' && (
          <Button size="sm" variant="primary" onClick={() => onComplete(chore.id)}>
            Complete
          </Button>
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="secondary" onClick={() => onEdit(chore)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => onDelete(chore.id)}>
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
