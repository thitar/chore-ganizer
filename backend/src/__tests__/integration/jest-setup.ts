/**
 * Jest Setup for Integration Tests
 *
 * This file runs before each test file
 */

import { logger } from '../../utils/logger.js'

// Increase default timeout for integration tests
jest.setTimeout(30000)

// Mock uuid to avoid ESM issues with uuid 13.x in Jest
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-9012-345678901234',
}))

// Suppress standard output in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason })
})
