import { useState } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'
import { Button } from './ui/Button'
import type { Assignment } from '../api/assignments.api'

interface AssignChoreFormProps {
  assignment?: Assignment
  onSuccess: (message: string) => void
  onCancel: () => void
}

export function AssignChoreForm({ assignment, onSuccess, onCancel }: AssignChoreFormProps) {
  const { createAssignment, isCreating, updateAssignment, isUpdating } = useAssignments()
  const { templates } = useTemplates()
  const { users } = useUsers()

  const isEditing = assignment !== undefined
  const children = users.filter(u => u.role === 'CHILD')

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    assignment ? String(assignment.choreTemplateId) : ''
  )
  const [selectedUserId, setSelectedUserId] = useState(
    assignment ? String(assignment.assignedToId) : ''
  )
  const [dueDate, setDueDate] = useState(assignment ? assignment.dueDate : '')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      if (assignment) {
        await updateAssignment(assignment.id, {
          userId: parseInt(selectedUserId, 10),
          dueDate,
        })
        onSuccess('Assignment updated!')
      } else {
        await createAssignment({
          templateId: parseInt(selectedTemplateId, 10),
          userId: parseInt(selectedUserId, 10),
          dueDate,
        })
        onSuccess('Assignment created!')
      }
    } catch {
      setFormError('Failed to save assignment. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert-error mb-4">{formError}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="template" className="block text-sm font-normal text-zinc-300 mb-1">Template</label>
          <select
            id="template"
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="input"
            required
            disabled={isEditing}
          >
            <option value="">Select a template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.points} pts)</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assignTo" className="block text-sm font-normal text-zinc-300 mb-1">Assign To</label>
          <select
            id="assignTo"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="input"
            required
          >
            <option value="">Select a family member...</option>
            {children.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-normal text-zinc-300 mb-1">Due Date</label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button type="submit" loading={isCreating || isUpdating}>
          {isCreating || isUpdating ? 'Saving...' : 'Save Assignment'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isCreating || isUpdating}>
          Discard changes
        </Button>
      </div>
    </form>
  )
}
