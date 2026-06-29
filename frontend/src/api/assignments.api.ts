import axios from 'axios'

const api = axios.create({ baseURL: '/api/assignments', withCredentials: true })

export interface Assignment {
  id: number
  type?: 'REGULAR' | 'RECURRING'
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

export async function getAll(): Promise<Assignment[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function create(data: {
  templateId: number
  userId: number
  dueDate: string
}): Promise<Assignment> {
  const response = await api.post('/', {
    choreTemplateId: data.templateId,
    assignedToId: data.userId,
    dueDate: data.dueDate,
  })
  return response.data.data
}

export async function update(
  id: number,
  data: { userId?: number; dueDate?: string }
): Promise<Assignment> {
  const body: Record<string, unknown> = {}
  if (data.userId !== undefined) body.assignedToId = data.userId
  if (data.dueDate !== undefined) body.dueDate = data.dueDate
  const response = await api.put(`/${id}`, body)
  return response.data.data
}

export async function complete(id: number): Promise<Assignment> {
  const response = await api.post(`/${id}/complete`)
  return response.data.data
}

export async function uncomplete(id: number): Promise<Assignment> {
  const response = await api.post(`/${id}/uncomplete`)
  return response.data.data
}

export async function delete_(id: number): Promise<{ deleted: true }> {
  const response = await api.delete(`/${id}`)
  return response.data.data
}
