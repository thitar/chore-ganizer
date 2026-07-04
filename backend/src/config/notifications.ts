import 'dotenv/config'

const BASE_URL = (process.env.NTFY_BASE_URL ?? '').trim().replace(/\/$/, '')
export const isNtfyConfigured = BASE_URL.length > 0

if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function getNtfyConfig() {
  return { baseUrl: BASE_URL }
}
