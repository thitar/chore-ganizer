import type { ChoreOccurrence, ChoreOccurrenceStatus } from '../../types/recurring-chores'

/**
 * Format a due date for display
 * Returns "Today", "Tomorrow", "Mon, Jan 15", or "Feb 20" format
 */
export function formatDueDate(date: string | Date): string {
  const dueDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Reset time parts for comparison
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  
  if (dueDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  }
  
  if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow'
  }
  
  // Check if it's within the current week (next 7 days)
  const daysFromNow = Math.floor((dueDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24))
  if (daysFromNow > 1 && daysFromNow <= 6) {
    // Show day of week for near dates: "Mon, Jan 15"
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[dueDate.getDay()]}, ${months[dueDate.getMonth()]} ${dueDate.getDate()}`
  }
  
  // For dates further out, show "Feb 20" format
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[dueDate.getMonth()]} ${dueDate.getDate()}`
}

/**
 * Get the date group label for an occurrence
 * Returns "Today", "Tomorrow", "This Week", or "Later"
 */
export function getDateGroupLabel(date: string | Date): string {
  const dueDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Reset time parts for comparison
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  
  if (dueDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  }
  
  if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow'
  }
  
  // Check if it's within the current week (next 7 days)
  const daysFromNow = Math.floor((dueDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24))
  if (daysFromNow > 1 && daysFromNow <= 6) {
    return 'This Week'
  }
  
  return 'Later'
}

/**
 * Group occurrences by date category
 * Returns a Map with keys: "Today", "Tomorrow", "This Week", "Later"
 */
export function groupOccurrencesByDate(occurrences: ChoreOccurrence[]): Map<string, ChoreOccurrence[]> {
  const groups = new Map<string, ChoreOccurrence[]>([
    ['Today', []],
    ['Tomorrow', []],
    ['This Week', []],
    ['Later', []]
  ])
  
  // Sort occurrences by due date first
  const sorted = [...occurrences].sort((a, b) => {
    const dateA = new Date(a.dueDate).getTime()
    const dateB = new Date(b.dueDate).getTime()
    return dateA - dateB
  })
  
  for (const occurrence of sorted) {
    const groupLabel = getDateGroupLabel(occurrence.dueDate)
    const group = groups.get(groupLabel)
    if (group) {
      group.push(occurrence)
    }
  }
  
  return groups
}

/**
 * Get Tailwind CSS classes for status styling
 */
export function getStatusColorClasses(status: ChoreOccurrenceStatus): {
  bg: string
  text: string
  border: string
  badge: string
} {
  switch (status) {
    case 'PENDING':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800'
      }
    case 'COMPLETED':
      return {
        bg: 'bg-green-50',
        text: 'text-green-800',
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-800'
      }
    case 'SKIPPED':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-600'
      }
    default:
      return {
        bg: 'bg-white',
        text: 'text-gray-800',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800'
      }
  }
}

/**
 * Format a timestamp for display (e.g., "2:30 PM" or "Feb 15, 2:30 PM")
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const today = new Date()
  const isToday = date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  
  if (isToday) {
    return timeStr
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${timeStr}`
}

/**
 * Get user initials for avatar display
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Check if a user can perform actions on an occurrence
 */
export function canUserAct(occurrence: ChoreOccurrence, userId: number): boolean {
  // User can act if they are assigned to this occurrence
  return occurrence.assignedUserIds.includes(userId)
}
