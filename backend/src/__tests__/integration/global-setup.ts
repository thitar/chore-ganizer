/**
 * Global Setup for Integration Tests
 * 
 * Runs once before all test files
 */

import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...')

  // Create test database directory
  const testDbDir = join(process.cwd(), 'test-db')
  if (!existsSync(testDbDir)) {
    mkdirSync(testDbDir, { recursive: true })
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = `file:${join(testDbDir, 'integration-test.db')}`
  process.env.SESSION_SECRET = 'test-session-secret-for-integration-tests'
  process.env.PORT = '0' // Use random available port

  console.log('✅ Integration test environment ready')
}
