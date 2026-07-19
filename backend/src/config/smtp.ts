export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const host = process.env.SMTP_HOST ?? ''
const port = parseInt(process.env.SMTP_PORT ?? '465', 10)
const user = process.env.SMTP_USER ?? ''
const pass = process.env.SMTP_PASS ?? ''
const from = process.env.SMTP_FROM ?? user

export const isSmtpConfigured: boolean = Boolean(host && user && pass)

export function getSmtpConfig(): SmtpConfig {
  return { host, port, user, pass, from }
}
