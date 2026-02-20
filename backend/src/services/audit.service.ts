import prisma from '../config/database.js'
import { Request } from 'express'
import { AUDIT_ACTIONS, AuditAction } from '../constants/audit-actions.js'

interface AuditLogParams {
  userId: number
  action: AuditAction
  entityType: string
  entityId?: number
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  const { userId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent } = params

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    })
  } catch (error) {
    // Don't throw - audit logging should not break main functionality
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Extract user info from request for audit logging
 */
export const getAuditContext = (req: Request) => {
  return {
    userId: req.user?.id,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.headers['user-agent'] || undefined,
  }
}

/**
 * Get audit logs with filtering
 */
export interface GetAuditLogsParams {
  userId?: number
  action?: string
  entityType?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

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
  timestamp: Date
}

export const getAuditLogs = async (params: GetAuditLogsParams): Promise<{ logs: AuditLogEntry[], total: number }> => {
  const { userId, action, entityType, startDate, endDate, page = 1, limit = 50 } = params

  const where: any = {}

  if (userId) where.userId = userId
  if (action) where.action = action
  if (entityType) where.entityType = entityType

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}

/**
 * Log a login event
 */
export const logLogin = async (req: Request, userId: number, success: boolean): Promise<void> => {
  const context = getAuditContext(req)
  await createAuditLog({
    userId,
    action: success ? AUDIT_ACTIONS.USER_LOGIN : AUDIT_ACTIONS.USER_LOGIN_FAILED,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

/**
 * Log a logout event
 */
export const logLogout = async (req: Request, userId: number): Promise<void> => {
  const context = getAuditContext(req)
  await createAuditLog({
    userId,
    action: AUDIT_ACTIONS.USER_LOGOUT,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}
