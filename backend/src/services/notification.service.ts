import { isNtfyConfigured, getNtfyConfig } from '../config/notifications'
import { assignedBody, dueSoonBody, completedBody } from './notification.formatters'

export { isNtfyConfigured }

export function relativeChoreUrl(id: number): string {
  return `/chores/${id}`
}

export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  opts: { priority?: 1 | 2 | 3 | 4 | 5; tags?: string[]; click?: string } = {}
): Promise<void> {
  if (!isNtfyConfigured || !topic) return
  const { baseUrl } = getNtfyConfig()
  const url = `${baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    Title: title,
    Priority: String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click
  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers,
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
}

export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = assignedBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}

export function notifyChoreDueSoon(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = dueSoonBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}

export function notifyChoreCompleted(
  assignment: AssignmentWithIncludes,
  parents: { ntfyTopic: string | null }[]
): void {
  for (const parent of parents) {
    const topic = parent.ntfyTopic
    if (!topic) continue
    const { title, body, priority, tags, click } = completedBody(assignment, { name: '' })
    void sendNtfy(topic, title, body, { priority, tags, click })
  }
}
