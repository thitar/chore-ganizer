/**
 * Integration Test Database Setup
 * 
 * This file configures a test database for integration tests.
 * Uses a separate SQLite file that is created fresh for each test run.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../../../../test-db/integration-test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

// Set environment before importing prisma
process.env.DATABASE_URL = TEST_DB_URL

// Create test database directory if it doesn't exist
const testDbDir = path.dirname(TEST_DB_PATH)
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true })
}

// Prisma client for tests
let prisma: PrismaClient

/**
 * Initialize the test database
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  // Delete existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }

  // Create new Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DB_URL,
      },
    },
  })

  // Run migrations by pushing schema
  // In production, you'd use prisma migrate deploy
  const { execSync } = require('child_process')
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: path.join(__dirname, '../../..'),
    stdio: 'pipe',
  })

  return prisma
}

/**
 * Seed the test database with base data
 */
export async function seedTestDatabase(): Promise<TestData> {
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create family
  const family = await prisma.family.create({
    data: {
      id: 'test-family-123',
      name: 'Test Family',
    },
  })

  // Create users
  const parent = await prisma.user.create({
    data: {
      email: 'parent@test.com',
      password: hashedPassword,
      name: 'Test Parent',
      role: 'PARENT',
      points: 100,
      color: '#3B82F6',
      familyId: family.id,
    },
  })

  const child1 = await prisma.user.create({
    data: {
      email: 'child1@test.com',
      password: hashedPassword,
      name: 'Test Child 1',
      role: 'CHILD',
      points: 50,
      basePocketMoney: 5.0,
      color: '#10B981',
      familyId: family.id,
    },
  })

  const child2 = await prisma.user.create({
    data: {
      email: 'child2@test.com',
      password: hashedPassword,
      name: 'Test Child 2',
      role: 'CHILD',
      points: 25,
      basePocketMoney: 3.0,
      color: '#F59E0B',
      familyId: family.id,
    },
  })

  // Create categories
  const householdCategory = await prisma.choreCategory.create({
    data: {
      name: 'Household',
      description: 'General household chores',
      icon: '🏠',
      color: '#3B82F6',
    },
  })

  const outdoorCategory = await prisma.choreCategory.create({
    data: {
      name: 'Outdoor',
      description: 'Outdoor chores',
      icon: '🌳',
      color: '#10B981',
    },
  })

  // Create chore templates
  const dishesTemplate = await prisma.choreTemplate.create({
    data: {
      title: 'Wash Dishes',
      description: 'Clean all dishes after dinner',
      points: 10,
      icon: '🍽️',
      color: '#3B82F6',
      categoryId: householdCategory.id,
      createdById: parent.id,
    },
  })

  const cleaningTemplate = await prisma.choreTemplate.create({
    data: {
      title: 'Clean Room',
      description: 'Tidy up bedroom',
      points: 15,
      icon: '🧹',
      color: '#10B981',
      categoryId: householdCategory.id,
      createdById: parent.id,
    },
  })

  const mowingTemplate = await prisma.choreTemplate.create({
    data: {
      title: 'Mow Lawn',
      description: 'Cut the grass in the backyard',
      points: 25,
      icon: '🌿',
      color: '#22C55E',
      categoryId: outdoorCategory.id,
      createdById: parent.id,
    },
  })

  return {
    family,
    users: { parent, child1, child2 },
    categories: { household: householdCategory, outdoor: outdoorCategory },
    templates: { dishes: dishesTemplate, cleaning: cleaningTemplate, mowing: mowingTemplate },
  }
}

/**
 * Clean up the test database
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
  }

  // Delete test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }

  // Also delete journal file if it exists
  const journalPath = `${TEST_DB_PATH}-journal`
  if (fs.existsSync(journalPath)) {
    fs.unlinkSync(journalPath)
  }
}

/**
 * Get the Prisma client
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call setupTestDatabase first.')
  }
  return prisma
}

/**
 * Clear all data from tables (for cleanup between tests)
 */
export async function clearDatabase(): Promise<void> {
  if (!prisma) return

  // Delete in order to respect foreign key constraints
  await prisma.pointTransaction.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.choreOccurrence.deleteMany()
  await prisma.recurringChoreRoundRobinPool.deleteMany()
  await prisma.recurringChoreFixedAssignee.deleteMany()
  await prisma.recurringChore.deleteMany()
  await prisma.choreAssignment.deleteMany()
  await prisma.choreTemplate.deleteMany()
  await prisma.choreCategory.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.userNotificationSettings.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.family.deleteMany()
}

/**
 * Test data type
 */
export interface TestData {
  family: { id: string; name: string }
  users: {
    parent: { id: number; email: string; name: string; role: string }
    child1: { id: number; email: string; name: string; role: string }
    child2: { id: number; email: string; name: string; role: string }
  }
  categories: {
    household: { id: number; name: string }
    outdoor: { id: number; name: string }
  }
  templates: {
    dishes: { id: number; title: string; points: number }
    cleaning: { id: number; title: string; points: number }
    mowing: { id: number; title: string; points: number }
  }
}
