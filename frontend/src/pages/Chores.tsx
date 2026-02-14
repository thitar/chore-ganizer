import React, { useState } from 'react'
import { useAuth, useAssignments, useUsers, useTemplates } from '../hooks'
import { Button } from '../components/common'
import { ChoreList, ChoreForm, ChoreFilters } from '../components/chores'
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

  const filteredAssignments = assignments.filter((assignment) => {
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
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
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
          <Button variant="primary" onClick={() => setIsFormOpen(true)}>
            Create Chore
          </Button>
        )}
      </div>

      <ChoreFilters currentFilter={filter} onFilterChange={setFilter} />

      <ChoreList
        chores={filteredAssignments}
        loading={loading}
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
