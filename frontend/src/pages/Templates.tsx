import React, { useState } from 'react'
import { useAuth, useTemplates, useCategories, useUsers } from '../hooks'
import { Button } from '../components/common'
import type { ChoreTemplate, CreateTemplateData, UpdateTemplateData } from '../types'

// Template Card Component
const TemplateCard: React.FC<{
  template: ChoreTemplate
  onEdit: (template: ChoreTemplate) => void
  onDelete: (id: number) => void
}> = ({ template, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4" style={{ borderLeftColor: template.color || '#4CAF50' }}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
          {template.description && (
            <p className="text-gray-600 text-sm mt-1">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {template.points} pts
            </span>
            {template.category && (
              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {template.category.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(template)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Template Form Component
const TemplateForm: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTemplateData | UpdateTemplateData) => Promise<void>
  template?: ChoreTemplate | null
  categories: { id: number; name: string }[]
  loading: boolean
}> = ({ isOpen, onClose, onSubmit, template, categories, loading }) => {
  const [title, setTitle] = useState(template?.title || '')
  const [description, setDescription] = useState(template?.description || '')
  const [points, setPoints] = useState(template?.points || 10)
  const [categoryId, setCategoryId] = useState<number | undefined>(template?.categoryId || undefined)
  const [color, setColor] = useState(template?.color || '#4CAF50')
  const [icon, setIcon] = useState(template?.icon || '')

  React.useEffect(() => {
    if (template) {
      setTitle(template.title)
      setDescription(template.description || '')
      setPoints(template.points)
      setCategoryId(template.categoryId || undefined)
      setColor(template.color || '#4CAF50')
      setIcon(template.icon || '')
    } else {
      setTitle('')
      setDescription('')
      setPoints(10)
      setCategoryId(undefined)
      setColor('#4CAF50')
      setIcon('')
    }
  }, [template, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title,
      description: description || undefined,
      points,
      categoryId,
      color,
      icon: icon || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Points</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min="0"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : (template ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const Templates: React.FC = () => {
  const { isParent } = useAuth()
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, fetchTemplates } = useTemplates()
  const { categories } = useCategories()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChoreTemplate | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const categoryOptions = categories.map(c => ({ id: c.id, name: c.name }))

  const handleCreate = async (data: CreateTemplateData | UpdateTemplateData) => {
    setFormLoading(true)
    const result = await createTemplate(data as CreateTemplateData)
    setFormLoading(false)
    if (result.success) {
      setIsFormOpen(false)
    }
  }

  const handleUpdate = async (data: CreateTemplateData | UpdateTemplateData) => {
    if (!editingTemplate) return
    setFormLoading(true)
    const result = await updateTemplate(editingTemplate.id, data as UpdateTemplateData)
    setFormLoading(false)
    if (result.success) {
      setEditingTemplate(null)
      setIsFormOpen(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    await deleteTemplate(id)
  }

  const handleEdit = (template: ChoreTemplate) => {
    setEditingTemplate(template)
    setIsFormOpen(true)
  }

  if (!isParent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have permission to manage templates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chore Templates</h1>
          <p className="text-gray-600">Manage reusable chore templates</p>
        </div>
        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
          Create Template
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No templates yet. Create your first template!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <TemplateForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingTemplate(null)
        }}
        onSubmit={editingTemplate ? handleUpdate : handleCreate}
        template={editingTemplate}
        categories={categoryOptions}
        loading={formLoading}
      />
    </div>
  )
}
