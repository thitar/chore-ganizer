import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/overdue')

export interface OverdueChore {
  id: number
  type: 'REGULAR' | 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING'
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

export async function getOverdue(): Promise<OverdueChore[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function cancelOverdue(
  id: number,
  type: 'REGULAR' | 'RECURRING',
  penalty: number
): Promise<{ status: 'CANCELLED'; penaltyPoints: number | null }> {
  const response = await api.post('/cancel', { id, type, penalty })
  return response.data.data
}

export async function rescheduleOverdue(id: number, dueDate: string): Promise<{ id: number; dueDate: string; status: string }> {
  const response = await api.post('/reschedule', { id, type: 'REGULAR', dueDate })
  return response.data.data
}
