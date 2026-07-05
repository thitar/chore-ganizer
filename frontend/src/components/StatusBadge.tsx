interface StatusBadgeProps {
  status: 'PENDING' | 'COMPLETED'
  overdue?: boolean
}

export function StatusBadge({ status, overdue }: StatusBadgeProps) {
  if (overdue && status === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-400">
        Overdue
      </span>
    )
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
        Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
      Completed
    </span>
  )
}
