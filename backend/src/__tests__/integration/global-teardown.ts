/**
 * Global Teardown for Integration Tests
 * 
 * Runs once after all test files
 */

import { existsSync, unlinkSync, rmdirSync } from 'fs'
import { join } from 'path'
import { logger } from '../../utils/logger.js'

export default async function globalTeardown() {
  logger.info('Cleaning up integration test environment...')

  // Clean up test database
  const testDbDir = join(process.cwd(), 'test-db')
  const testDbFile = join(testDbDir, 'integration-test.db')

  if (existsSync(testDbFile)) {
    try {
      unlinkSync(testDbFile)
      logger.info('Removed test database file')
    } catch (error) {
      logger.warn('Could not remove test database file', { error })
    }
  }

  // Also remove journal file if exists
  const journalFile = testDbFile + '-journal'
  if (existsSync(journalFile)) {
    try {
      unlinkSync(journalFile)
    } catch {
      // Ignore
    }
  }

  // Remove test-db directory if empty
  try {
    if (existsSync(testDbDir)) {
      rmdirSync(testDbDir)
      logger.info('Removed test database directory')
    }
  } catch {
    // Directory not empty or other error, ignore
  }

  logger.info('Integration test cleanup complete')
}
