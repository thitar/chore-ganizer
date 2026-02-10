import React, { useState } from 'react'
import { useAuth, useChores, useUsers } from '../hooks'
import { Button } from '../components/common'
import { ChoreList, ChoreForm, ChoreFilters } from '../components/chores'
import type { Chore, CreateChoreData, UpdateChoreData } from '../types'

export const Chores: React.FC = () => {
  const { user, isParent } = useAuth()
  const { chores, loading, error, createChore, updateChore, deleteChore, completeChore, refresh } = useChores()
  const { users } = useUsers()
  const [filter, setFilter] = useState('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | undefined>(undefined)
  const [formLoading, setFormLoading] = useState(false)

  const filteredChores = chores.filter((chore) => {
    if (filter === 'all') return true
    return chore.status === filter
  })

  const handleCreate = async (data: CreateChoreData) => {
    setFormLoading(true)
    const result = await createChore(data)
    setFormLoading(false)
    if (result.success) {
      setIsFormOpen(false)
      refresh()
    }
  }

  const handleUpdate = async (data: UpdateChoreData) => {
    if (!editingChore) return
    setFormLoading(true)
    const result = await updateChore(editingChore.id, data)
    setFormLoading(false)
    if (result.success) {
      setEditingChore(undefined)
      setIsFormOpen(false)
      refresh()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this chore?')) return
    const result = await deleteChore(id)
    if (result.success) {
      refresh()
    }
  }

  const handleComplete = async (id: number) => {
    const result = await completeChore(id)
    if (result.success) {
      alert(`Chore completed! You earned ${result.pointsAwarded} points!`)
      refresh()
    }
  }

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore)
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
        chores={filteredChores}
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
          setEditingChore(undefined)
        }}
        onSubmit={editingChore ? handleUpdate : handleCreate}
        chore={editingChore}
        users={users}
        loading={formLoading}
      />
    </div>
  )
}
