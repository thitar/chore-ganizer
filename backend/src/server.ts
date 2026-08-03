import 'dotenv/config'
import http from 'http'
import app from './app'
import { notifyOverdue } from './services/overdue.notification.service'

const PORT = Number(process.env.PORT) || 3010
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server with the Express app
const server = http.createServer(app)

const OVERDUE_SWEEP_INTERVAL_MS = 5 * 60 * 1000
let isOverdueSweepRunning = false

async function runOverdueSweep(): Promise<void> {
  if (isOverdueSweepRunning) return
  isOverdueSweepRunning = true
  try {
    await notifyOverdue()
  } catch (err) {
    console.warn(`[overdue] sweep failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    isOverdueSweepRunning = false
  }
}

const overdueSweepTimer = setInterval(() => {
  void runOverdueSweep()
}, OVERDUE_SWEEP_INTERVAL_MS)

void runOverdueSweep()

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`)
  console.log(`Health check: http://${HOST}:${PORT}/api/health`)
})

// Node's default for both of these is to crash the process — the right
// call, since the app's state after an uncaught error is unknown. Log first
// so the crash is diagnosable, then exit; Docker's restart policy brings the
// container back up.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  clearInterval(overdueSweepTimer)
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  clearInterval(overdueSweepTimer)
  server.close(() => process.exit(0))
})

export default server
