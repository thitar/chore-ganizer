import React, { useState, useEffect } from 'react'
import type { ChoreAssignment, ChoreTemplate, CreateAssignmentData, UpdateAssignmentData, User } from '../../types'
import { Input, Button, Modal } from '../common'

interface ChoreFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateAssignmentData | UpdateAssignmentData) => Promise<void>
  assignment?: ChoreAssignment
  users: User[]
  templates?: ChoreTemplate[]
  loading?: boolean
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  users,
  templates = [],
  loading = false,
}) => {
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [assignedToId, setAssignedToId] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (assignment) {
      setTemplateId(assignment.choreTemplateId)
      setAssignedToId(assignment.assignedToId)
      setDueDate(assignment.dueDate ? assignment.dueDate.split('T')[0] : '')
    } else {
      setTemplateId(null)
      setAssignedToId(null)
      setDueDate('')
    }
  }, [assignment, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateId || !assignedToId || !dueDate) return

    const data: CreateAssignmentData | UpdateAssignmentData = {
      templateId,
      assignedToId,
      dueDate,
    }

    await onSubmit(data)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={assignment ? 'Edit Assignment' : 'Create Assignment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chore Template</label>
          <select
            value={templateId || ''}
            onChange={(e) => setTemplateId(parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a chore template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} ({template.points} pts)
              </option>
            ))}
          </select>
        </div>
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
        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {assignment ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
