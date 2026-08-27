interface StatusBadgeProps {
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_COMPLETE'
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

  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 text-xs text-zinc-400">
        Cancelled
      </span>
    )
  }

  if (status === 'PARTIALLY_COMPLETE') {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-400">
        Partially Complete
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
      Completed
    </span>
  )
}
