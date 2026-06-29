interface StatusBadgeProps {
  status: 'PENDING' | 'COMPLETED'
  overdue?: boolean
}

export function StatusBadge({ status, overdue }: StatusBadgeProps) {
  if (overdue && status === 'PENDING') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-red-100 text-red-800">
        Overdue
      </span>
    )
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-yellow-100 text-yellow-800">
        Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-green-100 text-green-800">
      Completed
    </span>
  )
}
