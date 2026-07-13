import 'dotenv/config'
import http from 'http'
import app from './app'

const PORT = Number(process.env.PORT) || 3010
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server with the Express app
const server = http.createServer(app)

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
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  server.close(() => process.exit(0))
})

export default server
