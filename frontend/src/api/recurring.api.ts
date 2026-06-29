import axios from 'axios'

const api = axios.create({ baseURL: '/api/recurring', withCredentials: true })
const occurrencesApi = axios.create({ baseURL: '/api/occurrences', withCredentials: true })

export interface RecurringOccurrence {
  id: number
  type: 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING' | 'COMPLETED'
  completedAt: string | null
  pointsAwarded: number | null
  notes: string | null
  createdAt: string
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

export interface RecurringChore {
  id: number
  choreTemplateId: number
  assignedToId: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek: number | null
  dayOfMonth: number | null
  createdById: number
  createdAt: string
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

export async function getAll(): Promise<RecurringChore[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function create(data: {
  templateId: number
  userId: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek?: number | null
  dayOfMonth?: number | null
}): Promise<RecurringChore> {
  const response = await api.post('/', {
    choreTemplateId: data.templateId,
    assignedToId: data.userId,
    frequency: data.frequency,
    dayOfWeek: data.dayOfWeek ?? null,
    dayOfMonth: data.dayOfMonth ?? null,
  })
  return response.data.data
}

export async function delete_(id: number): Promise<{ deleted: true }> {
  const response = await api.delete(`/${id}`)
  return response.data.data
}

export async function complete(id: number): Promise<RecurringOccurrence> {
  const response = await occurrencesApi.post(`/${id}/complete`)
  return response.data.data
}
