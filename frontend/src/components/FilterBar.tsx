interface FilterBarProps {
  statusFilter: string
  onStatusChange: (value: string) => void
  userFilter?: string
  onUserChange?: (value: string) => void
  users?: { id: number; name: string }[]
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onClear: () => void
  showUserFilter?: boolean
}

export function FilterBar({
  statusFilter,
  onStatusChange,
  userFilter,
  onUserChange,
  users,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  showUserFilter,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3">
      <select
        value={statusFilter}
        onChange={e => onStatusChange(e.target.value)}
        className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring bg-white"
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      {showUserFilter && users && (
        <select
          value={userFilter}
          onChange={e => onUserChange?.(e.target.value)}
          className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring bg-white"
        >
          <option value="all">All Users</option>
          {users.map(u => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={dateFrom}
        onChange={e => onDateFromChange(e.target.value)}
        className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring"
      />
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring"
      />

      <button onClick={onClear} className="text-sm text-gray-500 hover:text-gray-700">
        Reset filters
      </button>
    </div>
  )
}
