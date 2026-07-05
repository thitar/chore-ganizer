import { useState, useEffect } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Template } from '../api/templates.api'
import { Skeleton } from '../components/ui/Skeleton'

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
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">Unable to load templates. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Chore Templates" />

      {templates.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-lg font-bold text-zinc-100 mb-1">No chore templates yet</p>
          <p className="text-zinc-400 mb-4">Create your first chore template to start assigning tasks.</p>
          <Button onClick={openCreate} className="mx-auto">
            <Plus className="h-4 w-4" /> Create Template
          </Button>
        </div>
      ) : (
        <>
          {!showForm && (
            <Button onClick={openCreate} className="mb-4">
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          )}

          {showForm && (
            <Card className="p-6 mb-4">
              {formError && <div className="alert-error mb-4">{formError}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-normal text-zinc-300 mb-1">Title</label>
                  <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" required />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-normal text-zinc-300 mb-1">Description</label>
                  <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" />
                </div>
                <div>
                  <label htmlFor="points" className="block text-sm font-normal text-zinc-300 mb-1">Points</label>
                  <input id="points" type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} className="input" required />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-normal text-zinc-300 mb-1">Category</label>
                  <input id="category" type="text" value={category} onChange={e => setCategory(e.target.value)} className="input" required />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" loading={isCreating || isUpdating} onClick={handleSubmit}>
                  {isCreating || isUpdating ? 'Saving...' : 'Save Template'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelForm} disabled={isCreating || isUpdating}>
                  Discard changes
                </Button>
              </div>
            </Card>
          )}

          {templates.length > 0 && (
            <Card>
              <div className="grid grid-cols-3 px-4 py-3 border-b border-edge bg-white/5 text-sm font-normal text-zinc-400">
                <div>Template</div>
                <div>Points</div>
                <div>Actions</div>
              </div>
              {templates.map(template => (
                <div key={template.id}>
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 items-center hover:bg-white/5">
                    <div>
                      <div className="font-bold text-zinc-100">{template.title}</div>
                      {template.category && <div className="text-sm text-zinc-400">{template.category}</div>}
                    </div>
                    <div className="text-zinc-400">{template.points} pts</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(template)} className="p-1 text-zinc-500 hover:text-zinc-100" aria-label="Edit template">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeletingTemplateId(template.id)} className="p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete template">
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
            </Card>
          )}
        </>
      )}

      {successMessage && (
        <Toast kind="success">{successMessage}</Toast>
      )}
    </AppShell>
  )
}
