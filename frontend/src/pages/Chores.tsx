import React, { useState, useEffect } from 'react'
import { useAuth, useAssignments, useUsers, useTemplates } from '../hooks'
import { Button } from '../components/common'
import { ChoreList, ChoreForm, ChoreFilters } from '../components/chores'
import { assignmentsApi } from '../api'
import type { ChoreAssignment, CreateAssignmentData, UpdateAssignmentData } from '../types'

export const Chores: React.FC = () => {
  const { user, isParent } = useAuth()
  const { assignments, loading, error, createAssignment, updateAssignment, deleteAssignment, completeAssignment, fetchAssignments } = useAssignments()
  const { users } = useUsers()
  const { templates } = useTemplates()
  const [filter, setFilter] = useState('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ChoreAssignment | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [myAssignments, setMyAssignments] = useState<ChoreAssignment[]>([])
  const [myLoading, setMyLoading] = useState(true)

  // For children, fetch only their own assignments
  useEffect(() => {
    if (!user?.id) return
    
    loadMyAssignments()
  }, [user?.id, isParent])

  const loadMyAssignments = async () => {
    try {
      setMyLoading(true)
      // Children only see their own assignments
      if (!isParent && user?.id) {
        const data = await assignmentsApi.getAll({ userId: user.id })
        setMyAssignments(data)
      }
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setMyLoading(false)
    }
  }

  // For parents, use all assignments; for children, use only their own
  const displayAssignments = isParent ? assignments : myAssignments
  const isLoading = isParent ? loading : myLoading

  const filteredAssignments = displayAssignments.filter((assignment) => {
    if (filter === 'all') return true
    return assignment.status === filter
  })

  const handleCreate = async (data: CreateAssignmentData | UpdateAssignmentData) => {
    setFormLoading(true)
    const result = await createAssignment(data as CreateAssignmentData)
    setFormLoading(false)
    if (result.success) {
      setIsFormOpen(false)
      fetchAssignments()
    }
  }

  const handleUpdate = async (data: CreateAssignmentData | UpdateAssignmentData) => {
    if (!editingAssignment) return
    setFormLoading(true)
    const result = await updateAssignment(editingAssignment.id, data as UpdateAssignmentData)
    setFormLoading(false)
    if (result.success) {
      setEditingAssignment(undefined)
      setIsFormOpen(false)
      fetchAssignments()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return
    const result = await deleteAssignment(id)
    if (result.success) {
      fetchAssignments()
    }
  }

  const handleComplete = async (id: number, status: 'COMPLETED' | 'PARTIALLY_COMPLETE' = 'COMPLETED') => {
    const result = await completeAssignment(id, { status })
    if (result.success) {
      const statusText = status === 'PARTIALLY_COMPLETE' ? 'partially completed' : 'completed'
      setSuccessMessage(`Chore ${statusText}! You earned ${result.pointsAwarded} points!`)
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
      // Refresh the assignments list for children
      if (!isParent) {
        await loadMyAssignments()
      }
    }
  }

  const handleEdit = (assignment: ChoreAssignment) => {
    setEditingAssignment(assignment)
    setIsFormOpen(true)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chores</h1>
          <p className="text-gray-600">Manage your family chores</p>
        </div>
        {isParent && (
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              Create Chore
            </Button>
          </div>
        )}
      </div>

      {/* Info box about recurring chores */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm text-blue-800">
            <strong>One-time chores only.</strong> This page is for creating individual chore assignments. 
            For recurring chores (e.g., weekly tasks) or round-robin assignment, use the{' '}
            <a href="/recurring-chores" className="underline font-medium hover:text-blue-900">
              Recurring Chores
            </a> page.
          </p>
        </div>
      </div>

      <ChoreFilters currentFilter={filter} onFilterChange={setFilter} />

      <ChoreList
        chores={filteredAssignments}
        loading={isLoading}
        error={error}
        onComplete={handleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={isParent}
        canComplete={!isParent}
        currentUser={user}
      />

      <ChoreForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingAssignment(undefined)
        }}
        onSubmit={editingAssignment ? handleUpdate : handleCreate}
        assignment={editingAssignment}
        users={users}
        templates={templates}
        loading={formLoading}
      />
    </div>
  )
}
