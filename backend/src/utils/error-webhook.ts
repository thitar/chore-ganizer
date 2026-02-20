import axios from 'axios'
import { logger } from './logger.js'

interface ErrorWebhookConfig {
  enabled: boolean
  url: string
  username?: string
  password?: string
  minPriority?: number // Minimum priority to send (1-5, default 4 for errors)
}

interface ErrorNotification {
  title: string
  message: string
  priority: number
  tags: string[]
  details?: {
    path?: string
    method?: string
    statusCode?: number
    stack?: string
    timestamp: string
  }
}

/**
 * Get error webhook configuration from environment
 */
export const getErrorWebhookConfig = (): ErrorWebhookConfig => {
  return {
    enabled: process.env.ERROR_WEBHOOK_ENABLED === 'true',
    url: process.env.ERROR_WEBHOOK_URL || '',
    username: process.env.ERROR_WEBHOOK_USERNAME,
    password: process.env.ERROR_WEBHOOK_PASSWORD,
    minPriority: parseInt(process.env.ERROR_WEBHOOK_MIN_PRIORITY || '4', 10),
  }
}

/**
 * Send error notification to webhook (ntfy)
 */
export const sendErrorNotification = async (notification: ErrorNotification): Promise<boolean> => {
  const config = getErrorWebhookConfig()

  if (!config.enabled || !config.url) {
    logger.debug('[ErrorWebhook] Webhook disabled or URL not configured')
    return false
  }

  if (notification.priority < (config.minPriority || 4)) {
    logger.debug(`[ErrorWebhook] Priority ${notification.priority} below minimum ${config.minPriority}`)
    return false
  }

  try {
    // Parse ntfy URL - format: https://ntfy.sh/topic
    const url = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url
    const urlParts = url.split('/')
    const topic = urlParts.pop() || 'chore-ganizer-errors'
    const serverUrl = urlParts.join('/')

    // Build headers for ntfy
    const headers: Record<string, string> = {
      'Title': notification.title,
      'Priority': notification.priority.toString(),
      'Tags': notification.tags.join(','),
      'Content-Type': 'text/plain',
    }

    // Add Basic Auth if credentials are provided
    if (config.username && config.password) {
      const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    // Build message body
    let message = notification.message
    if (notification.details) {
      message += `\n\n--- Details ---`
      if (notification.details.path) {
        message += `\nPath: ${notification.details.method || 'GET'} ${notification.details.path}`
      }
      if (notification.details.statusCode) {
        message += `\nStatus: ${notification.details.statusCode}`
      }
      message += `\nTime: ${notification.details.timestamp}`
      if (notification.details.stack && process.env.NODE_ENV !== 'production') {
        message += `\n\nStack:\n${notification.details.stack.substring(0, 500)}`
      }
    }

    // Send to ntfy server
    await axios.post(`${serverUrl}/${topic}`, message, {
      headers,
      timeout: 5000, // 5 second timeout
    })

    logger.info(`[ErrorWebhook] Error notification sent to topic: ${topic}`)
    return true
  } catch (error: any) {
    logger.error('[ErrorWebhook] Failed to send error notification:', error.message)
    return false
  }
}

/**
 * Send notification for unhandled errors (5xx)
 */
export const notifyServerError = async (
  error: Error,
  req?: { path: string; method: string }
): Promise<void> => {
  const notification: ErrorNotification = {
    title: '🚨 Server Error - Chore-Ganizer',
    message: error.message || 'An unexpected error occurred',
    priority: 5, // Highest priority
    tags: ['rotating_light', 'error', 'server'],
    details: {
      path: req?.path,
      method: req?.method,
      statusCode: 500,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  }

  await sendErrorNotification(notification)
}

/**
 * Send notification for database errors
 */
export const notifyDatabaseError = async (
  error: Error,
  operation?: string
): Promise<void> => {
  const notification: ErrorNotification = {
    title: '💾 Database Error - Chore-Ganizer',
    message: `Database error during ${operation || 'unknown operation'}: ${error.message}`,
    priority: 5,
    tags: ['database', 'error', 'warning'],
    details: {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  }

  await sendErrorNotification(notification)
}

/**
 * Send notification for backup failures
 */
export const notifyBackupFailure = async (
  error: Error,
  backupType: string
): Promise<void> => {
  const notification: ErrorNotification = {
    title: '💾 Backup Failed - Chore-Ganizer',
    message: `${backupType} backup failed: ${error.message}`,
    priority: 4,
    tags: ['floppy_disk', 'warning', 'backup'],
    details: {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  }

  await sendErrorNotification(notification)
}

/**
 * Send notification for health check failures
 */
export const notifyHealthCheckFailure = async (
  component: string,
  details: string
): Promise<void> => {
  const notification: ErrorNotification = {
    title: '❤️ Health Check Failed - Chore-Ganizer',
    message: `${component} health check failed: ${details}`,
    priority: 4,
    tags: ['heart', 'warning', 'health'],
    details: {
      timestamp: new Date().toISOString(),
    },
  }

  await sendErrorNotification(notification)
}
