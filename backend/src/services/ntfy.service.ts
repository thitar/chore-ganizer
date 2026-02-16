import axios from 'axios'

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
 * Send a push notification via ntfy
 */
export const sendNtfyNotification = async (options: SendNotificationOptions): Promise<boolean> => {
  const { serverUrl, topic, title, message, priority = 3, tags = [], clickUrl, username, password } = options

  // Validate inputs
  if (!serverUrl || !topic || !title || !message) {
    console.warn('[NtfyService] Missing required fields for notification')
    return false
  }

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
    await axios.post(`${url}/${topic}`, message, {
      headers,
      timeout: 5000, // 5 second timeout
    })

    console.log(`[NtfyService] Notification sent successfully to topic: ${topic}`)
    return true
  } catch (error: any) {
    console.error('[NtfyService] Failed to send notification:', error.message)
    if (error.response) {
      console.error('[NtfyService] Response status:', error.response.status)
      console.error('[NtfyService] Response data:', error.response.data)
    }
    return false
  }
}

/**
 * Check if ntfy server is reachable
 */
export const checkNtfyConnection = async (serverUrl: string, username?: string, password?: string): Promise<boolean> => {
  try {
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
} as const

export const NotificationTags = {
  CHORE_ASSIGNED: ['clipboard', 'new'],
  CHORE_DUE_SOON: ['warning', 'clock'],
  CHORE_COMPLETED: ['white_check_mark', 'star'],
  CHORE_OVERDUE: ['x', 'warning'],
  POINTS_EARNED: ['star', 'sparkles'],
} as const

export type NotificationType = keyof typeof NotificationPriorities
