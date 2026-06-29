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
