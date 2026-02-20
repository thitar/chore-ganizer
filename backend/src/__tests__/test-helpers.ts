/**
 * Test Utilities for Chore-Ganizer Backend
 * 
 * This file provides common mocks, fixtures, and helpers for unit tests.
 */

import { Request, Response, NextFunction } from 'express'

// ============================================
// Mock Factories
// ============================================

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    session: {},
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ...overrides,
  } as Partial<Request>
}

/**
 * Create a mock Express Response object
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    locals: {},
  }
  return res
}

/**
 * Create a mock NextFunction
 */
export function createMockNext(): NextFunction {
  return jest.fn()
}

// ============================================
// Test Fixtures
// ============================================

/**
 * Mock user data for testing
 */
export const mockUsers = {
  parent: {
    id: 1,
    email: 'parent@test.com',
    name: 'Test Parent',
    role: 'PARENT',
    points: 100,
    basePocketMoney: 0,
    color: '#3B82F6',
    familyId: 'family-123',
    createdAt: new Date('2024-01-01'),
    password: '$2b$10$hashedpassword',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockedAt: null,
  },
  child: {
    id: 2,
    email: 'child@test.com',
    name: 'Test Child',
    role: 'CHILD',
    points: 50,
    basePocketMoney: 5.0,
    color: '#10B981',
    familyId: 'family-123',
    createdAt: new Date('2024-01-01'),
    password: '$2b$10$hashedpassword',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lockedAt: null,
  },
  lockedUser: {
    id: 3,
    email: 'locked@test.com',
    name: 'Locked User',
    role: 'CHILD',
    points: 0,
    basePocketMoney: 0,
    color: '#EF4444',
    familyId: 'family-123',
    createdAt: new Date('2024-01-01'),
    password: '$2b$10$hashedpassword',
    failedLoginAttempts: 5,
    lockoutUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    lockedAt: new Date(),
  },
}

/**
 * Mock chore template data for testing
 */
export const mockTemplates = {
  dishes: {
    id: 1,
    title: 'Wash Dishes',
    description: 'Clean all dishes after dinner',
    points: 10,
    icon: '🍽️',
    color: '#3B82F6',
    categoryId: 1,
    createdById: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  cleaning: {
    id: 2,
    title: 'Clean Room',
    description: 'Tidy up bedroom',
    points: 15,
    icon: '🧹',
    color: '#10B981',
    categoryId: 1,
    createdById: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

/**
 * Mock chore assignment data for testing
 */
export const mockAssignments = {
  pending: {
    id: 1,
    choreTemplateId: 1,
    assignedToId: 2,
    assignedById: 1,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'PENDING',
    notes: null,
    createdAt: new Date(),
    completedAt: null,
    penaltyApplied: false,
    penaltyPoints: null,
  },
  completed: {
    id: 2,
    choreTemplateId: 1,
    assignedToId: 2,
    assignedById: 1,
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    status: 'COMPLETED',
    notes: 'Done well!',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    penaltyApplied: false,
    penaltyPoints: null,
  },
  overdue: {
    id: 3,
    choreTemplateId: 2,
    assignedToId: 2,
    assignedById: 1,
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    status: 'PENDING',
    notes: null,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    completedAt: null,
    penaltyApplied: false,
    penaltyPoints: null,
  },
}

/**
 * Mock chore category data for testing
 */
export const mockCategories = {
  household: {
    id: 1,
    name: 'Household',
    description: 'General household chores',
    icon: '🏠',
    color: '#3B82F6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  outdoor: {
    id: 2,
    name: 'Outdoor',
    description: 'Outdoor chores',
    icon: '🌳',
    color: '#10B981',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

/**
 * Mock recurring chore data for testing
 */
export const mockRecurringChores = {
  daily: {
    id: 1,
    title: 'Feed Pet',
    description: 'Feed the family pet',
    points: 5,
    icon: '🐕',
    color: '#F59E0B',
    categoryId: 1,
    createdById: 1,
    startDate: new Date('2024-01-01'),
    recurrenceRule: JSON.stringify({ frequency: 'DAILY', interval: 1 }),
    assignmentMode: 'FIXED',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  weekly: {
    id: 2,
    title: 'Weekly Cleaning',
    description: 'Deep clean bedroom',
    points: 20,
    icon: '🧹',
    color: '#10B981',
    categoryId: 1,
    createdById: 1,
    startDate: new Date('2024-01-01'),
    recurrenceRule: JSON.stringify({ frequency: 'WEEKLY', interval: 1, byDayOfWeek: [6] }), // Saturday
    assignmentMode: 'ROUND_ROBIN',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

/**
 * Mock chore occurrence data for testing
 */
export const mockOccurrences = {
  pending: {
    id: 1,
    recurringChoreId: 1,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: 'PENDING',
    assignedUserIds: JSON.stringify([2]),
    roundRobinIndex: null,
    completedAt: null,
    completedById: null,
    skippedAt: null,
    skippedById: null,
    skipReason: null,
    pointsAwarded: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  completed: {
    id: 2,
    recurringChoreId: 1,
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    status: 'COMPLETED',
    assignedUserIds: JSON.stringify([2]),
    roundRobinIndex: null,
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    completedById: 2,
    skippedAt: null,
    skippedById: null,
    skipReason: null,
    pointsAwarded: 5,
    notes: 'Good job!',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
}

/**
 * Mock notification settings for testing
 */
export const mockNotificationSettings = {
  default: {
    id: 1,
    userId: 1,
    ntfyTopic: null,
    ntfyServerUrl: 'https://ntfy.sh',
    ntfyUsername: null,
    ntfyPassword: null,
    notifyChoreAssigned: true,
    notifyChoreDueSoon: true,
    notifyChoreCompleted: true,
    notifyChoreOverdue: true,
    notifyPointsEarned: true,
    reminderHoursBefore: 2,
    quietHoursStart: null,
    quietHoursEnd: null,
    overduePenaltyEnabled: true,
    overduePenaltyMultiplier: 2,
    notifyParentOnOverdue: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

/**
 * Mock point transaction data for testing
 */
export const mockTransactions = {
  earned: {
    id: 1,
    userId: 2,
    type: 'EARNED',
    amount: 10,
    description: 'Completed: Wash Dishes',
    choreAssignmentId: 2,
    relatedUserId: null,
    createdAt: new Date(),
  },
  bonus: {
    id: 2,
    userId: 2,
    type: 'BONUS',
    amount: 5,
    description: 'Bonus for good behavior',
    choreAssignmentId: null,
    relatedUserId: 1,
    createdAt: new Date(),
  },
  payout: {
    id: 3,
    userId: 2,
    type: 'PAYOUT',
    amount: -50,
    description: 'Monthly payout',
    choreAssignmentId: null,
    relatedUserId: null,
    createdAt: new Date(),
  },
}

// ============================================
// Prisma Mock Helper
// ============================================

/**
 * Create a comprehensive Prisma mock
 */
export function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    choreTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    choreAssignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    choreCategory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recurringChore: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    choreOccurrence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userNotificationSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    pointTransaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      aggregate: jest.fn(),
    },
    payout: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pocketMoneyConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      pointTransaction: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
    })),
  }
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a response was called with specific status and JSON
 */
export function expectResponse(res: Partial<Response>, status: number, data: any) {
  expect(res.status).toHaveBeenCalledWith(status)
  expect(res.json).toHaveBeenCalledWith(data)
}

/**
 * Assert that next was called (middleware passed)
 */
export function expectNextCalled(next: NextFunction) {
  expect(next).toHaveBeenCalled()
}

/**
 * Assert that next was NOT called (middleware blocked)
 */
export function expectNextNotCalled(next: NextFunction) {
  expect(next).not.toHaveBeenCalled()
}
