import { useState, useEffect } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { NavBar } from '../components/NavBar'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Template } from '../api/templates.api'

export function TemplatesPage() {
  const {
    templates,
    isLoading,
    error,
    createTemplate,
    isCreating,
    updateTemplate,
    isUpdating,
    deleteTemplate,
    isDeleting,
  } = useTemplates()

  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState('')
  const [category, setCategory] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  function resetForm() {
    setTitle('')
    setDescription('')
    setPoints('')
    setCategory('')
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingTemplate(null)
    resetForm()
  }

  function openCreate() {
    setShowForm(true)
    setEditingTemplate(null)
    resetForm()
  }

  function openEdit(template: Template) {
    setShowForm(true)
    setEditingTemplate(template)
    setTitle(template.title)
    setDescription(template.description ?? '')
    setPoints(String(template.points))
    setCategory(template.category ?? '')
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          title,
          description: description || undefined,
          points: parseInt(points, 10),
          category,
        })
      } else {
        await createTemplate({
          title,
          description: description || undefined,
          points: parseInt(points, 10),
          category,
        })
      }
      cancelForm()
      setSuccessMessage('Template saved!')
    } catch {
      setFormError('Failed to save template. Please try again.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTemplate(id)
      setDeletingTemplateId(null)
      setSuccessMessage('Deleted.')
    } catch {
      setFormError('Failed to delete template.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading templates...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load templates. Check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Chore Templates</h2>

        {templates.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <p className="text-lg font-bold text-gray-900 mb-1">No chore templates yet</p>
            <p className="text-gray-600 mb-4">Create your first chore template to start assigning tasks.</p>
            <button onClick={openCreate} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover flex items-center gap-1 mx-auto">
              <Plus className="h-4 w-4" /> Create Template
            </button>
          </div>
        ) : (
          <>
            {!showForm && (
              <button onClick={openCreate} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover mb-4 flex items-center gap-1">
                <Plus className="h-4 w-4" /> Create Template
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-4">
                {formError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{formError}</div>}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-normal text-gray-700 mb-1">Title</label>
                    <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-normal text-gray-700 mb-1">Description</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" />
                  </div>
                  <div>
                    <label htmlFor="points" className="block text-sm font-normal text-gray-700 mb-1">Points</label>
                    <input id="points" type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-normal text-gray-700 mb-1">Category</label>
                    <input id="category" type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring" required />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={isCreating || isUpdating} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50">
                    {isCreating || isUpdating ? 'Saving...' : 'Save Template'}
                  </button>
                  <button type="button" onClick={cancelForm} disabled={isCreating || isUpdating} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Discard changes
                  </button>
                </div>
              </form>
            )}

            {templates.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-3 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
                  <div>Template</div>
                  <div>Points</div>
                  <div>Actions</div>
                </div>
                {templates.map(template => (
                  <div key={template.id}>
                    <div className="grid grid-cols-3 gap-4 px-4 py-3 items-center hover:bg-gray-50">
                      <div>
                        <div className="font-bold text-gray-900">{template.title}</div>
                        {template.category && <div className="text-sm text-gray-500">{template.category}</div>}
                      </div>
                      <div className="text-gray-600">{template.points} pts</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(template)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Edit template">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingTemplateId(template.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete template">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {deletingTemplateId === template.id && (
                      <div className="px-4 pb-3">
                        <ConfirmDelete
                          message="This will permanently delete the chore template and all its assignments. This cannot be undone. Continue?"
                          deleteLabel="Delete Template"
                          keepLabel="Keep Template"
                          onDelete={() => handleDelete(template.id)}
                          onCancel={() => setDeletingTemplateId(null)}
                          isDeleting={isDeleting}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
    </div>
  )
}
