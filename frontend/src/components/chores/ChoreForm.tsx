import React, { useState, useEffect } from 'react'
import type { Chore, CreateChoreData, UpdateChoreData, User } from '../../types'
import { Input, Button, Modal } from '../common'

interface ChoreFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateChoreData | UpdateChoreData) => Promise<void>
  chore?: Chore
  users: User[]
  loading?: boolean
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  chore,
  users,
  loading = false,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState(10)
  const [assignedToId, setAssignedToId] = useState<number | null>(null)

  useEffect(() => {
    if (chore) {
      setTitle(chore.title)
      setDescription(chore.description || '')
      setPoints(chore.points)
      setAssignedToId(chore.assignedToId)
    } else {
      setTitle('')
      setDescription('')
      setPoints(10)
      setAssignedToId(null)
    }
  }, [chore, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignedToId) return

    const data: CreateChoreData | UpdateChoreData = {
      title,
      description,
      points,
      assignedToId,
    }

    await onSubmit(data)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chore ? 'Edit Chore' : 'Create Chore'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Enter chore title"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter chore description (optional)"
          />
        </div>
        <Input
          label="Points"
          type="number"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          min="1"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            value={assignedToId || ''}
            onChange={(e) => setAssignedToId(parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a family member</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {chore ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
