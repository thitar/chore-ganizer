import http from 'http'
import app from './app.js'
import dotenv from 'dotenv'
import { logger } from './utils/logger.js'
import { PrismaClient } from '@prisma/client'
import { getInFlightRequests, initiateShutdown } from './middleware/shutdownMiddleware.js'

// Load environment variables
dotenv.config()

// Create Prisma client for database connection management
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Shutdown timeout in milliseconds (30 seconds)
const SHUTDOWN_TIMEOUT = 30000

/**
 * Enhanced graceful shutdown handler.
 * Stops accepting new requests, waits for in-flight requests to complete,
 * and properly closes database connections.
 */
const gracefulShutdown = async (signal: string) => {
  logger.info({ message: `Received ${signal}, starting graceful shutdown...` })
  
  // Signal the middleware to stop accepting new requests
  initiateShutdown()
  
  // Stop accepting new connections by closing the HTTP server
  server.close(() => {
    logger.info({ message: 'HTTP server closed - no more incoming connections' })
  })
  
  // Create a promise that resolves after the shutdown timeout
  const shutdownTimeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      logger.warn({ message: 'Shutdown timeout reached, forcing exit' })
      resolve()
    }, SHUTDOWN_TIMEOUT)
  })
  
  // Create a promise that waits for all in-flight requests to complete
  const waitForRequestsPromise = new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      const inFlight = getInFlightRequests()
      if (inFlight <= 0) {
        clearInterval(checkInterval)
        logger.info({ message: 'All in-flight requests completed' })
        resolve()
      } else {
        logger.info({ message: `Waiting for ${inFlight} in-flight request(s) to complete...` })
      }
    }, 1000) // Check every second
  })
  
  // Wait for either all requests to complete OR timeout to expire
  await Promise.race([waitForRequestsPromise, shutdownTimeoutPromise])
  
  // Close database connection
  try {
    await prisma.$disconnect()
    logger.info({ message: 'Database connections closed' })
  } catch (error) {
    logger.error({ message: 'Error closing database connections', error })
  }
  
  logger.info({ message: 'Graceful shutdown complete' })
  process.exit(0)
}

// Create HTTP server with the Express app
const server = http.createServer(app)

server.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`)
  logger.info(`API documentation: http://${HOST}:${PORT}/api`)
  logger.info(`Health check: http://${HOST}:${PORT}/health`)
})

// Graceful shutdown handlers for SIGTERM and SIGINT
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: initiating graceful shutdown')
  gracefulShutdown('SIGTERM')
})

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: initiating graceful shutdown')
  gracefulShutdown('SIGINT')
})

export default server
