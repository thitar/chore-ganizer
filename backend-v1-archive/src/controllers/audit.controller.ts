import { Request, Response } from 'express'
import * as auditService from '../services/audit.service.js'

/**
 * GET /api/audit
 * Get audit logs (parents only)
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  const { userId, action, entityType, startDate, endDate, page, limit } = req.query

  const result = await auditService.getAuditLogs({
    userId: userId ? Number(userId) : undefined,
    action: action as string,
    entityType: entityType as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  })

  res.json({
    success: true,
    data: {
      logs: result.logs,
      total: result.total,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      totalPages: Math.ceil(result.total / (Number(limit) || 50)),
    },
  })
}
