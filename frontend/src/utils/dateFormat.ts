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
