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
    <div className="rounded-2xl border border-edge bg-surface p-4 flex flex-wrap items-center gap-3">
      <select
        value={statusFilter}
        onChange={e => onStatusChange(e.target.value)}
        className="input !w-auto text-sm"
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      {showUserFilter && users && (
        <select
          value={userFilter}
          onChange={e => onUserChange?.(e.target.value)}
          className="input !w-auto text-sm"
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
        className="input !w-auto text-sm"
      />
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        className="input !w-auto text-sm"
      />

      <button onClick={onClear} className="text-sm text-zinc-400 hover:text-zinc-100">
        Reset filters
      </button>
    </div>
  )
}
