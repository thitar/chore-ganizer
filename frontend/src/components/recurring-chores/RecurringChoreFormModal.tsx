import React, { useState, useEffect } from 'react'
import type {
  RecurringChore,
  CreateRecurringChoreRequest,
  RecurrenceRule,
  AssignmentMode,
} from '../../types/recurring-chores'
import type { User, ChoreCategory, ChoreTemplate } from '../../types'
import { RecurrenceRuleEditor } from './RecurrenceRuleEditor'
import { AssignmentModeSelector } from './AssignmentModeSelector'
import { Button, Input } from '../common'

interface RecurringChoreFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateRecurringChoreRequest) => Promise<void>
  initialData?: RecurringChore | null
  availableChildren: User[]
  categories: ChoreCategory[]
  templates?: ChoreTemplate[]
  isSubmitting?: boolean
}

const DEFAULT_RECURRENCE_RULE: RecurrenceRule = {
  frequency: 'WEEKLY',
  interval: 1,
  dayOfWeek: [],
}

export function RecurringChoreFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableChildren,
  categories,
  templates = [],
  isSubmitting = false,
}: RecurringChoreFormModalProps) {
  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState(1)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RECURRENCE_RULE)
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('FIXED')
  const [fixedAssigneeIds, setFixedAssigneeIds] = useState<number[]>([])
  const [roundRobinPoolIds, setRoundRobinPoolIds] = useState<number[]>([])

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle template selection
  const handleTemplateChange = (templateId: number | '') => {
    setSelectedTemplateId(templateId)
    if (templateId) {
      const selectedTemplate = templates.find(t => t.id === templateId)
      if (selectedTemplate) {
        setTitle(selectedTemplate.title)
        setDescription(selectedTemplate.description || '')
        setPoints(selectedTemplate.points)
        setCategoryId(selectedTemplate.categoryId ?? undefined)
      }
    }
  }

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setSelectedTemplateId('')
      setTitle(initialData.title)
      setDescription(initialData.description || '')
      setPoints(initialData.points)
      setCategoryId(initialData.categoryId ?? undefined)
      setStartDate(initialData.startDate.split('T')[0])
      setRecurrenceRule(initialData.recurrenceRule)
      setAssignmentMode(initialData.assignmentMode)
      setFixedAssigneeIds(initialData.fixedAssignees.map((u) => u.id))
      setRoundRobinPoolIds(initialData.roundRobinPool.map((m) => m.userId))
    } else {
      // Reset form for new chore
      setSelectedTemplateId('')
      setTitle('')
      setDescription('')
      setPoints(1)
      setCategoryId(undefined)
      const today = new Date()
      setStartDate(today.toISOString().split('T')[0])
      setRecurrenceRule(DEFAULT_RECURRENCE_RULE)
      setAssignmentMode('FIXED')
      setFixedAssigneeIds([])
      setRoundRobinPoolIds([])
    }
    setErrors({})
  }, [initialData, isOpen])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (points < 0) {
      newErrors.points = 'Points must be 0 or greater'
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required'
    }

    // Validate recurrence rule
    if (recurrenceRule.frequency === 'WEEKLY' && (!recurrenceRule.dayOfWeek || recurrenceRule.dayOfWeek.length === 0)) {
      newErrors.recurrenceRule = 'Please select at least one day for weekly recurrence'
    }

    // Validate assignment
    if (assignmentMode === 'FIXED' && fixedAssigneeIds.length === 0) {
      newErrors.assignment = 'Please select at least one child for fixed assignment'
    }

    if (assignmentMode === 'ROUND_ROBIN' && roundRobinPoolIds.length === 0) {
      newErrors.assignment = 'Please add at least one child to the rotation pool'
    }

    if (assignmentMode === 'MIXED' && fixedAssigneeIds.length === 0 && roundRobinPoolIds.length === 0) {
      newErrors.assignment = 'Please add at least one fixed assignee or rotation member'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const data: CreateRecurringChoreRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      points,
      categoryId,
      startDate,
      recurrenceRule,
      assignmentMode,
      fixedAssigneeIds: assignmentMode === 'FIXED' || assignmentMode === 'MIXED' ? fixedAssigneeIds : undefined,
      roundRobinPoolIds: assignmentMode === 'ROUND_ROBIN' || assignmentMode === 'MIXED' ? roundRobinPoolIds : undefined,
    }

    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Edit Recurring Chore' : 'New Recurring Chore'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chore Definition Selection */}
          {!initialData && templates.length > 0 && (
            <div>
              <label htmlFor="choreDefinition" className="block text-sm font-medium text-gray-700 mb-1">
                Use Chore Definition (optional)
              </label>
              <select
                id="choreDefinition"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">None - Create custom</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({template.points} pts)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a chore definition to pre-fill the form, or create a custom chore.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Clean bedroom"
              error={errors.title}
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this chore..."
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Points and Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Points */}
            <div>
              <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                Points
              </label>
              <Input
                id="points"
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                error={errors.points}
                disabled={isSubmitting}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={categoryId ?? ''}
                onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.startDate}
              disabled={isSubmitting}
            />
          </div>

          {/* Recurrence Rule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence Rule
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <RecurrenceRuleEditor
                value={recurrenceRule}
                onChange={setRecurrenceRule}
                startDate={startDate ? new Date(startDate) : undefined}
                disabled={isSubmitting}
              />
            </div>
            {errors.recurrenceRule && (
              <p className="mt-1 text-sm text-red-600">{errors.recurrenceRule}</p>
            )}
          </div>

          {/* Assignment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignment
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <AssignmentModeSelector
                mode={assignmentMode}
                onModeChange={setAssignmentMode}
                fixedAssigneeIds={fixedAssigneeIds}
                onFixedAssigneesChange={setFixedAssigneeIds}
                roundRobinPoolIds={roundRobinPoolIds}
                onRoundRobinPoolChange={setRoundRobinPoolIds}
                availableChildren={availableChildren}
                disabled={isSubmitting}
              />
            </div>
            {errors.assignment && (
              <p className="mt-1 text-sm text-red-600">{errors.assignment}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : initialData
                  ? 'Update Chore'
                  : 'Create Chore'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
