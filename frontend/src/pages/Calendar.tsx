import React, { useState, useEffect } from 'react'
import CalendarView from '../components/chores/CalendarView'
import { Modal, Button } from '../components/common'
import { useAuth, useAssignments, useTemplates, useUsers } from '../hooks'
import type { ChoreAssignment } from '../types'

export const Calendar: React.FC = () => {
  const { user, isParent } = useAuth()
  const { completeAssignment, createAssignment } = useAssignments()
  const { templates, fetchTemplates } = useTemplates()
  const { users, refresh: refreshUsers } = useUsers()
  const [selectedAssignment, setSelectedAssignment] = useState<ChoreAssignment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewChoreModalOpen, setIsNewChoreModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [customPoints, setCustomPoints] = useState<number | ''>('')
  
  // New chore form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newChoreTemplateId, setNewChoreTemplateId] = useState<number | ''>('')
  const [newChoreUserId, setNewChoreUserId] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch templates and users on mount
  useEffect(() => {
    fetchTemplates()
    refreshUsers()
  }, [])

  const handleAssignmentClick = (assignment: ChoreAssignment) => {
    setSelectedAssignment(assignment)
    setCustomPoints('')
    setIsModalOpen(true)
  }

  const handleDateClick = (date: Date) => {
    if (!isParent) return // Only parents can create assignments
    setSelectedDate(date)
    setNewChoreTemplateId('')
    setNewChoreUserId('')
    setIsNewChoreModalOpen(true)
  }

  const handleCreateAssignment = async () => {
    if (!newChoreTemplateId || !newChoreUserId || !selectedDate) return
    
    setIsSubmitting(true)
    try {
      const result = await createAssignment({
        templateId: Number(newChoreTemplateId),
        assignedToId: Number(newChoreUserId),
        dueDate: selectedDate.toISOString(),
      })
      
      if (result.success) {
        setSuccessMessage('Assignment created successfully!')
        setIsNewChoreModalOpen(false)
        setRefreshTrigger(prev => prev + 1)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async (status: 'COMPLETED' | 'PARTIALLY_COMPLETE' = 'COMPLETED') => {
    if (!selectedAssignment) return
    const points = customPoints !== '' ? Number(customPoints) : undefined
    const result = await completeAssignment(selectedAssignment.id, { status, customPoints: points })
    if (result.success) {
      const statusText = status === 'PARTIALLY_COMPLETE' ? 'partially completed' : 'completed'
      setSuccessMessage(`Chore ${statusText}! You earned ${result.pointsAwarded} points!`)
      setIsModalOpen(false)
      setRefreshTrigger(prev => prev + 1)
      setCustomPoints('')
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const canComplete = (assignment: ChoreAssignment) => {
    if (isParent) return true
    return assignment.assignedToId === user?.id
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600">View your chore assignments by date</p>
        {isParent && <p className="text-sm text-gray-500 mt-1">Click on an empty date to add a chore</p>}
      </div>

      <CalendarView 
        onAssignmentClick={handleAssignmentClick} 
        onDateClick={handleDateClick}
        refreshTrigger={refreshTrigger} 
      />

      {/* Assignment Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAssignment?.choreTemplate?.title || 'Assignment Details'}
      >
        {selectedAssignment && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Assigned to</p>
              <p className="font-medium">{selectedAssignment.assignedTo.name}</p>
            </div>
            
            {selectedAssignment.choreTemplate?.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p>{selectedAssignment.choreTemplate.description}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">
                {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                {selectedAssignment.isOverdue && selectedAssignment.status === 'PENDING' && (
                  <span className="ml-2 text-red-600 font-bold">Overdue!</span>
                )}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Points</p>
              <p className="font-medium">{selectedAssignment.choreTemplate?.points || 0} points</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  selectedAssignment.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-800'
                    : selectedAssignment.status === 'PARTIALLY_COMPLETE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : selectedAssignment.isOverdue
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {selectedAssignment.status === 'PARTIALLY_COMPLETE' ? 'PARTIALLY COMPLETE' : selectedAssignment.status}
              </span>
            </div>

            {selectedAssignment.status === 'PENDING' && canComplete(selectedAssignment) && (
              <div className="space-y-3">
                {/* Custom points input for parents */}
                {isParent && (
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Custom Points (optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={`Default: ${selectedAssignment.choreTemplate?.points || 0}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave empty to use default points</p>
                  </div>
                )}

                {/* Completion buttons - always show both buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleComplete('COMPLETED')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleComplete('PARTIALLY_COMPLETE')}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Partial
                  </button>
                </div>
              </div>
            )}

            {selectedAssignment.status === 'COMPLETED' && (
              <p className="text-green-600 font-medium text-center">
                ✓ Completed on {new Date(selectedAssignment.completedAt!).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* New Chore Assignment Modal */}
      <Modal
        isOpen={isNewChoreModalOpen}
        onClose={() => setIsNewChoreModalOpen(false)}
        title="Add Chore Assignment"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">
              {selectedDate?.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Chore Template</label>
            <select
              value={newChoreTemplateId}
              onChange={(e) => setNewChoreTemplateId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a chore...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} ({template.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Assign to</label>
            <select
              value={newChoreUserId}
              onChange={(e) => setNewChoreUserId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a family member...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsNewChoreModalOpen(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAssignment}
              disabled={!newChoreTemplateId || !newChoreUserId || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
