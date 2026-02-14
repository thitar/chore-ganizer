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

  const handleComplete = async (id: number) => {
    const result = await completeAssignment(id)
    if (result.success) {
      alert(`Chore completed! You earned ${result.pointsAwarded} points!`)
      fetchAssignments()
    }
  }

  const handleEdit = (assignment: ChoreAssignment) => {
    setEditingAssignment(assignment)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6">
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
