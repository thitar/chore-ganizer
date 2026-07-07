const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function formatDateStatus(dateStr: string): {
  label: string
  isOverdue: boolean
  isToday: boolean
} {
  const date = new Date(dateStr)
  const today = startOfDay(new Date())
  const dueDate = startOfDay(date)

  return {
    label: formatDateLabel(dateStr),
    isOverdue: dueDate < today,
    isToday: dueDate.getTime() === today.getTime(),
  }
}

export function formatDueDate(dateStr: string): {
  label: string
  isOverdue: boolean
  isToday: boolean
  isTomorrow: boolean
} {
  const date = new Date(dateStr)
  const today = startOfDay(new Date())
  const dueDate = startOfDay(date)
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let label: string
  if (diffDays === 0) {
    label = 'Today'
  } else if (diffDays === 1) {
    label = 'Tomorrow'
  } else if (diffDays > 0 && diffDays <= 6) {
    label = `in ${diffDays} days`
  } else {
    label = formatDateLabel(dateStr)
  }

  return {
    label,
    isOverdue: diffDays < 0,
    isToday: diffDays === 0,
    isTomorrow: diffDays === 1,
  }
}
