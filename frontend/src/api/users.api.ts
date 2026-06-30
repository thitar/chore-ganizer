import axios from 'axios'

const api = axios.create({ baseURL: '/api/users', withCredentials: true })

export interface UserSummary {
  id: number
  name: string
  role: string
  color: string
  ntfyTopic: string | null
}

export interface UserWithEmail extends UserSummary {
  email: string
}

export async function getAll(): Promise<UserSummary[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: 'PARENT' | 'CHILD'
  color: string
}): Promise<UserWithEmail> {
  const response = await api.post('/', data)
  return response.data.data
}

export async function deleteUser(id: number): Promise<{ deleted: true }> {
  const response = await api.delete(`/${id}`)
  return response.data.data
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ updated: true }> {
  const response = await api.put('/me/password', { currentPassword, newPassword })
  return response.data.data
}

export async function updateColor(color: string): Promise<UserWithEmail> {
  const response = await api.put('/me/color', { color })
  return response.data.data
}

export async function updateNtfyTopic(ntfyTopic: string | null): Promise<UserWithEmail> {
  const payload = ntfyTopic === '' ? null : ntfyTopic
  const response = await api.put('/me/ntfy-topic', { ntfyTopic: payload })
  return response.data.data
}
