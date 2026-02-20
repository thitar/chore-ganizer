import React, { useState, useEffect, useCallback } from 'react'
import { useAuth, useUsers, useCategories, useTemplates } from '../hooks'
import { recurringChoresApi } from '../api/recurring-chores.api'
import type {
  RecurringChore,
  ChoreOccurrence,
  CreateRecurringChoreRequest,
  UpdateRecurringChoreRequest,
  ChoreOccurrenceStatus,
} from '../types/recurring-chores'
import type { User, ChoreCategory } from '../types'
import { OccurrenceList } from '../components/recurring-chores'
import { RecurringChoresList } from '../components/recurring-chores/RecurringChoresList'
import { RecurringChoreFormModal } from '../components/recurring-chores/RecurringChoreFormModal'
import { Button } from '../components/common'

type ViewMode = 'occurrences' | 'manage'
type OccurrenceFilter = 'all' | 'pending' | 'completed' | 'skipped'

export function RecurringChoresPage() {
  const { user, isParent } = useAuth()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { templates } = useTemplates()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('occurrences')
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceFilter>('all')

  // Data state
  const [occurrences, setOccurrences] = useState<ChoreOccurrence[]>([])
  const [recurringChores, setRecurringChores] = useState<RecurringChore[]>([])
  const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(true)
  const [isLoadingChores, setIsLoadingChores] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<RecurringChore | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Processing state for occurrence actions
  const [processingId, setProcessingId] = useState<number | null>(null)

  // Delete confirmation state
  const [deletingChore, setDeletingChore] = useState<RecurringChore | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get family children (users with CHILD role)
  const familyChildren = users.filter((u) => u.role === 'CHILD')

  // Fetch occurrences
  const fetchOccurrences = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingOccurrences(true)
      const params: { status?: ChoreOccurrenceStatus; assignedToMe?: boolean } = {}

      if (occurrenceFilter !== 'all') {
        params.status = occurrenceFilter.toUpperCase() as ChoreOccurrenceStatus
      }

      // For children, only show their own assigned occurrences
      if (!isParent) {
        params.assignedToMe = true
      }

      const data = await recurringChoresApi.listOccurrences(params)
      setOccurrences(data)
    } catch (error) {
      console.error('Failed to fetch occurrences:', error)
    } finally {
      setIsLoadingOccurrences(false)
    }
  }, [user, isParent, occurrenceFilter])

  // Fetch recurring chores (for manage view)
  const fetchRecurringChores = useCallback(async () => {
    if (!isParent) return

    try {
      setIsLoadingChores(true)
      const data = await recurringChoresApi.list()
      setRecurringChores(data)
    } catch (error) {
      console.error('Failed to fetch recurring chores:', error)
    } finally {
      setIsLoadingChores(false)
    }
  }, [isParent])

  // Initial data fetch
  useEffect(() => {
    fetchOccurrences()
  }, [fetchOccurrences])

  // Fetch recurring chores when switching to manage view
  useEffect(() => {
    if (viewMode === 'manage' && isParent) {
      fetchRecurringChores()
    }
  }, [viewMode, isParent, fetchRecurringChores])

  // Handle completing an occurrence
  const handleCompleteOccurrence = async (occurrence: ChoreOccurrence) => {
    if (!user) return

    try {
      setProcessingId(occurrence.id)
      await recurringChoresApi.completeOccurrence(occurrence.id, {
        completedById: user.id,
      })
      await fetchOccurrences()
    } catch (error) {
      console.error('Failed to complete occurrence:', error)
    } finally {
      setProcessingId(null)
    }
  }

  // Handle skipping an occurrence
  const handleSkipOccurrence = async (occurrence: ChoreOccurrence) => {
    if (!user) return

    try {
      setProcessingId(occurrence.id)
      await recurringChoresApi.skipOccurrence(occurrence.id, {
        skippedById: user.id,
      })
      await fetchOccurrences()
    } catch (error) {
      console.error('Failed to skip occurrence:', error)
    } finally {
      setProcessingId(null)
    }
  }

  // Handle unskipping an occurrence
  const handleUnskipOccurrence = async (occurrence: ChoreOccurrence) => {
    try {
      setProcessingId(occurrence.id)
      await recurringChoresApi.unskipOccurrence(occurrence.id)
      await fetchOccurrences()
    } catch (error) {
      console.error('Failed to unskip occurrence:', error)
    } finally {
      setProcessingId(null)
    }
  }

  // Handle opening create modal
  const handleCreateChore = () => {
    setEditingChore(null)
    setIsModalOpen(true)
  }

  // Handle opening edit modal
  const handleEditChore = (chore: RecurringChore) => {
    setEditingChore(chore)
    setIsModalOpen(true)
  }

  // Handle delete chore
  const handleDeleteChore = async (chore: RecurringChore) => {
    setDeletingChore(chore)
  }

  // Confirm delete chore
  const confirmDeleteChore = async (deleteFutureOccurrences: boolean) => {
    if (!deletingChore) return

    try {
      setIsDeleting(true)
      await recurringChoresApi.delete(deletingChore.id, deleteFutureOccurrences)
      setRecurringChores(recurringChores.filter((c) => c.id !== deletingChore.id))
      setDeletingChore(null)
      // Also refresh occurrences since deleting may affect them
      await fetchOccurrences()
    } catch (error) {
      console.error('Failed to delete recurring chore:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle form submission
  const handleFormSubmit = async (data: CreateRecurringChoreRequest) => {
    try {
      setIsSubmitting(true)

      if (editingChore) {
        const updated = await recurringChoresApi.update(
          editingChore.id,
          data as UpdateRecurringChoreRequest
        )
        setRecurringChores(recurringChores.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const created = await recurringChoresApi.create(data)
        setRecurringChores([...recurringChores, created])
      }

      setIsModalOpen(false)
      setEditingChore(null)
      // Refresh occurrences to show any new ones
      await fetchOccurrences()
    } catch (error) {
      console.error('Failed to save recurring chore:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingChore(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recurring Chores</h1>
        {isParent && (
          <Button onClick={handleCreateChore} className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Recurring Chore
          </Button>
        )}
      </div>

      {/* View toggle tabs (only for parents) */}
      {isParent && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setViewMode('occurrences')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'occurrences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Chores
          </button>
          <button
            onClick={() => setViewMode('manage')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Recurring Chores
          </button>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'occurrences' || !isParent ? (
        <OccurrenceList
          occurrences={occurrences}
          onComplete={handleCompleteOccurrence}
          onSkip={handleSkipOccurrence}
          onUnskip={handleUnskipOccurrence}
          currentUserId={user?.id || 0}
          isLoading={isLoadingOccurrences}
          filter={occurrenceFilter}
          onFilterChange={setOccurrenceFilter}
          processingId={processingId}
        />
      ) : (
        <RecurringChoresList
          recurringChores={recurringChores}
          onEdit={handleEditChore}
          onDelete={handleDeleteChore}
          isLoading={isLoadingChores}
        />
      )}

      {/* Create/Edit Modal */}
      <RecurringChoreFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        initialData={editingChore}
        availableChildren={familyChildren}
        categories={categories}
        templates={templates}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {deletingChore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Recurring Chore</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deletingChore.title}"?
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="deleteFutureOccurrences"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-sm text-gray-700">
                  Also delete all future occurrences of this chore
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeletingChore(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const deleteFuture = (
                    document.getElementById('deleteFutureOccurrences') as HTMLInputElement
                  )?.checked
                  confirmDeleteChore(deleteFuture)
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
