import 'dotenv/config'

export const isNtfyConfigured = Boolean(process.env.NTFY_DEFAULT_SERVER_URL)

export function getNtfyConfig() {
  return {
    baseUrl: process.env.NTFY_DEFAULT_SERVER_URL || 'https://ntfy.sh',
  }
}
