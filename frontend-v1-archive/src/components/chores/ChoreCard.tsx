import React from 'react'
import type { ChoreAssignment } from '../../types'
import { Button } from '../common'

interface ChoreCardProps {
  chore: ChoreAssignment
  onComplete: (id: number, status?: 'COMPLETED' | 'PARTIALLY_COMPLETE') => void
  onEdit: (assignment: ChoreAssignment) => void
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
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    PARTIALLY_COMPLETE: 'bg-orange-100 text-orange-800',
  }

  const title = chore.choreTemplate?.title || 'Untitled'
  const description = chore.choreTemplate?.description
  const points = chore.choreTemplate?.points || 0
  const dueDate = chore.dueDate ? new Date(chore.dueDate).toLocaleDateString() : 'No due date'
  const isOverdue = chore.isOverdue

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[chore.status] || statusColors.PENDING}`}>
          {chore.status === 'PARTIALLY_COMPLETE' ? 'PARTIALLY COMPLETE' : chore.status}
        </span>
      </div>
      {description && (
        <p className="text-gray-600 text-sm mb-3">{description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <div>
          <span>Assigned to: {chore.assignedTo.name}</span>
          {isOverdue && chore.status === 'PENDING' && (
            <span className="ml-2 text-red-600 font-medium">Overdue!</span>
          )}
        </div>
        <span className="font-semibold text-blue-600">{points} pts</span>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Due: {dueDate}
      </div>
      <div className="flex gap-2">
        {canComplete && chore.status === 'PENDING' && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => onComplete(chore.id, 'COMPLETED')}>
              Complete
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onComplete(chore.id, 'PARTIALLY_COMPLETE')}>
              Partial
            </Button>
          </div>
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
