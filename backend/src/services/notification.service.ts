import { isNtfyConfigured, getNtfyConfig } from '../config/notifications'
import { dueSoonBody } from './notification.formatters'

type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
  dueNotifiedAt: Date | null
  status: string
}

export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  opts: { priority?: 1 | 2 | 3 | 4 | 5; tags?: string[]; click?: string } = {}
): Promise<boolean> {
  if (!isNtfyConfigured || !topic) return false
  const { baseUrl } = getNtfyConfig()
  const url = `${baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    Title: title,
    Priority: String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)
  try {
    await fetch(url, { method: 'POST', body, headers, signal: controller.signal })
    return true
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function notifyChoreDueSoon(assignment: AssignmentWithIncludes): Promise<boolean> {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return false
  const { title, body, priority, tags, click } = dueSoonBody(assignment)
  return sendNtfy(topic, title, body, { priority, tags, click })
}
