import 'dotenv/config'

const RAW_BASE_URL = (process.env.NTFY_BASE_URL ?? '').trim().replace(/\/$/, '')
const HAS_VALID_SCHEME = /^https?:\/\//i.test(RAW_BASE_URL)
const BASE_URL = HAS_VALID_SCHEME ? RAW_BASE_URL : ''
export const isNtfyConfigured = BASE_URL.length > 0

if (RAW_BASE_URL.length > 0 && !HAS_VALID_SCHEME) {
  console.error(
    `[ntfy] NTFY_BASE_URL is set to "${RAW_BASE_URL}" but is missing "http://" or "https://" — notifications are disabled until this is fixed.`
  )
} else if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function getNtfyConfig() {
  return { baseUrl: BASE_URL }
}

export function getOverdueConfig() {
  const timezone = (process.env.NOTIFY_TIMEZONE ?? 'Europe/Oslo').trim() || 'Europe/Oslo'
  const raw = (process.env.NOTIFY_OVERDUE_HOUR ?? '08:00').trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  const hour = match ? Number(match[1]) : 8
  const minute = match ? Number(match[2]) : 0
  return {
    timezone,
    hour: hour >= 0 && hour <= 23 ? hour : 8,
    minute: minute >= 0 && minute <= 59 ? minute : 0,
  }
}
