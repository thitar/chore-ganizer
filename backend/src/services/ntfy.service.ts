import axios from 'axios'
import { AppError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

interface NtfyMessage {
  topic: string
  title: string
  message: string
  priority?: number // 1-5, default 3
  tags?: string[] // Emoji tags
  click?: string // URL to open when clicked
  actions?: NtfyAction[]
}

interface NtfyAction {
  action: 'view' | 'http'
  label: string
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

interface SendNotificationOptions {
  serverUrl: string
  topic: string
  title: string
  message: string
  priority?: number
  tags?: string[]
  clickUrl?: string
  username?: string
  password?: string
}

/**
 * Validate ntfy server URL to prevent SSRF attacks.
 * Rejects private/internal IPs and non-HTTP(S) protocols.
 */
export const validateNtfyServerUrl = (serverUrl: string): void => {
  const allowedProtocols = ['http:', 'https:']
  let url: URL
  try {
    url = new URL(serverUrl)
  } catch {
    throw new AppError('Invalid notification server URL', 400, 'VALIDATION_ERROR')
  }

  if (!allowedProtocols.includes(url.protocol)) {
    throw new AppError('Invalid notification server URL: only HTTP and HTTPS are allowed', 400, 'VALIDATION_ERROR')
  }

  // Block private IP ranges and localhost
  const hostname = url.hostname
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  ) {
    throw new AppError('Invalid notification server URL: private/internal addresses are not allowed', 400, 'VALIDATION_ERROR')
  }
}

/**
 * Send a push notification via ntfy
 */
export const sendNtfyNotification = async (options: SendNotificationOptions): Promise<boolean> => {
  const { serverUrl, topic, title, message, priority = 3, tags = [], clickUrl, username, password } = options

  // Validate inputs
  if (!serverUrl || !topic || !title || !message) {
    logger.warn('Missing required fields for notification', { component: 'NtfyService' })
    return false
  }

  // Validate server URL to prevent SSRF
  validateNtfyServerUrl(serverUrl)

  // Build the ntfy message
  const ntfyMessage: NtfyMessage = {
    topic,
    title,
    message,
    priority,
    tags,
  }

  if (clickUrl) {
    ntfyMessage.click = clickUrl
  }

  try {
    // Construct the full URL
    const url = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl

    // Build headers
    const headers: Record<string, string> = {
      'Title': title,
      'Priority': priority.toString(),
      'Tags': tags.join(','),
      ...(clickUrl && { 'Click': clickUrl }),
    }

    // Add Basic Auth if credentials are provided
    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    // Send to ntfy server
    const response = await axios.post(`${url}/${topic}`, message, {
      headers,
      timeout: 10000, // Increased from 5s to 10s to handle slower connections
      validateStatus: (status) => status < 500, // Treat 4xx as success (message queued), only fail on 5xx
    })

    // Log response status for debugging
    logger.info('Notification sent', { component: 'NtfyService', topic, status: response.status })
    return true
  } catch (error: any) {
    logger.error('Failed to send notification', { component: 'NtfyService', error: error.message })
    if (error.response) {
      logger.error('Notification response error', { component: 'NtfyService', status: error.response.status, data: error.response.data })
    } else if (error.code === 'ECONNABORTED') {
      logger.error('Request timeout - but notification may still be queued', { component: 'NtfyService' })
    }
    return false
  }
}

/**
 * Check if ntfy server is reachable
 */
export const checkNtfyConnection = async (serverUrl: string, username?: string, password?: string): Promise<boolean> => {
  try {
    // Validate server URL to prevent SSRF
    validateNtfyServerUrl(serverUrl)

    const url = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl
    
    const headers: Record<string, string> = {}
    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${credentials}`
    }

    const response = await axios.get(`${url}/health`, { 
      headers,
      timeout: 3000 
    })
    return response.status === 200 || response.status === 404 // 404 is fine, means server is up
  } catch (error: any) {
    // If we get any response, the server is reachable
    if (error.response) {
      return true
    }
    return false
  }
}

/**
 * Notification types with their default settings
 */
export const NotificationPriorities = {
  CHORE_ASSIGNED: 3,
  CHORE_DUE_SOON: 4,
  CHORE_COMPLETED: 2,
  CHORE_OVERDUE: 5,
  POINTS_EARNED: 2,
  PENALTY: 4,
} as const

export const NotificationTags = {
  CHORE_ASSIGNED: ['clipboard', 'new'],
  CHORE_DUE_SOON: ['warning', 'clock'],
  CHORE_COMPLETED: ['white_check_mark', 'star'],
  CHORE_OVERDUE: ['x', 'warning'],
  POINTS_EARNED: ['star', 'sparkles'],
  PENALTY: ['x', 'warning'],
} as const

export type NotificationType = keyof typeof NotificationPriorities
