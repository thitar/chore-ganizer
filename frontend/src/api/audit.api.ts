import apiClient from './client'

export interface AuditLogEntry {
  id: number
  userId: number
  action: string
  entityType: string
  entityId: number | null
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

export interface AuditLogsResponse {
  success: boolean
  data: {
    logs: AuditLogEntry[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AuditLogsParams {
  userId?: number
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export const auditApi = {
  getAuditLogs: async (params?: AuditLogsParams): Promise<AuditLogsResponse> => {
    const queryParams = new URLSearchParams()
    
    if (params?.userId) queryParams.append('userId', String(params.userId))
    if (params?.action) queryParams.append('action', params.action)
    if (params?.entityType) queryParams.append('entityType', params.entityType)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const response = await apiClient.get<AuditLogsResponse>(`/audit?${queryParams}`)
    return response.data
  },
}
