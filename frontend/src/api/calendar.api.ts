import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/assignments')

export interface CalendarAssignment {
  id: number
  type: 'REGULAR' | 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING' | 'COMPLETED'
  pointsAwarded: number | null
  template: {
    id: number
    title: string
    points: number
    category: string | null
  }
  assignedTo: {
    id: number
    name: string
    color: string
  }
}

export async function getCalendar(from: string, to: string): Promise<CalendarAssignment[]> {
  const response = await api.get('/', { params: { from, to } })
  return response.data.data
}
