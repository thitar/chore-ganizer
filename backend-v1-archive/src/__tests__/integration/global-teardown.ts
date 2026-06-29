/**
 * Global Teardown for Integration Tests
 * 
 * Runs once after all test files
 */

import { existsSync, unlinkSync, rmdirSync } from 'fs'
import { join } from 'path'

export default async function globalTeardown() {
  console.log('Cleaning up integration test environment...')

  // Clean up test database
  const testDbDir = join(process.cwd(), 'test-db')
  const testDbFile = join(testDbDir, 'integration-test.db')

  if (existsSync(testDbFile)) {
    try {
      unlinkSync(testDbFile)
      console.log('Removed test database file')
    } catch (error) {
      console.warn('Could not remove test database file', error)
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
      console.log('Removed test database directory')
    }
  } catch {
    // Directory not empty or other error, ignore
  }

  console.log('Integration test cleanup complete')
}
