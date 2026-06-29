interface ConfirmDeleteProps {
  message: string
  deleteLabel: string
  keepLabel: string
  onDelete: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export function ConfirmDelete({
  message,
  deleteLabel,
  keepLabel,
  onDelete,
  onCancel,
  isDeleting,
}: ConfirmDeleteProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-800 mb-3">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : deleteLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {keepLabel}
        </button>
      </div>
    </div>
  )
}
