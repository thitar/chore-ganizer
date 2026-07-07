import { Button } from './ui/Button'

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
    <div className="rounded-2xl border border-edge bg-surface-raised p-4">
      <p className="text-sm text-zinc-300 mb-3">{message}</p>
      <div className="flex gap-2">
        <Button onClick={onDelete} disabled={isDeleting} variant="danger">
          {isDeleting ? 'Deleting...' : deleteLabel}
        </Button>
        <Button onClick={onCancel} disabled={isDeleting} variant="secondary">
          {keepLabel}
        </Button>
      </div>
    </div>
  )
}
