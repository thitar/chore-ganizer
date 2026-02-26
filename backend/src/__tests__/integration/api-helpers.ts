/**
 * API Test Helpers for Integration Tests
 * 
 * Provides utilities for making authenticated API requests
 * against the actual Express server.
 */

import express from 'express'
import request from 'supertest'
import session from 'express-session'
import routes from '../../routes/index.js'
import { TestData } from './db-setup.js'

// Declare module for session type
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number
      email: string
      name: string
      role: string
      familyId: string | null
    }
  }
}

/**
 * Create a test Express app with session support
 */
export function createTestApp(): express.Application {
  const app = express()
  
  app.use(express.json())
  
  // Session middleware for tests - using MemoryStore (default)
  // This is fine for testing, not for production
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'test-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  )
  
  // CSRF token endpoint
  app.get('/api/csrf-token', (_req, res) => {
    res.json({ csrfToken: 'test-csrf-token' })
  })
  
  // Mount API routes
  app.use('/api', routes)
  
  return app
}

/**
 * Test client for making API requests
 */
export class ApiClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agent: any
  private currentUser: TestData['users'][keyof TestData['users']] | null = null

  constructor(app: express.Application) {
    this.agent = request.agent(app)
  }

  /**
   * Login as a specific user
   */
  async login(user: TestData['users'][keyof TestData['users']]): Promise<void> {
    this.currentUser = user
    
    // Create a session by logging in
    const response = await this.agent
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      })
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body?.error?.message || response.text}`)
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await this.agent.post('/api/auth/logout')
    this.currentUser = null
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.currentUser
  }

  // ============================================
  // Auth Endpoints
  // ============================================

  async getMe() {
    return this.agent.get('/api/auth/me')
  }

  // ============================================
  // Users Endpoints
  // ============================================

  async getUsers() {
    return this.agent.get('/api/users')
  }

  async getUser(id: number) {
    return this.agent.get(`/api/users/${id}`)
  }

  async createUser(data: {
    email: string
    password: string
    name: string
    role: string
    color?: string
    basePocketMoney?: number
  }) {
    return this.agent.post('/api/users').send(data)
  }

  async updateUser(id: number, data: {
    name?: string
    email?: string
    color?: string
    basePocketMoney?: number
    points?: number
  }) {
    return this.agent.put(`/api/users/${id}`).send(data)
  }

  async deleteUser(id: number) {
    return this.agent.delete(`/api/users/${id}`)
  }

  // ============================================
  // Chore Templates Endpoints
  // ============================================

  async getTemplates() {
    return this.agent.get('/api/chore-templates')
  }

  async getTemplate(id: number) {
    return this.agent.get(`/api/chore-templates/${id}`)
  }

  async createTemplate(data: {
    title: string
    description?: string
    points: number
    icon?: string
    color?: string
    categoryId?: number
  }) {
    return this.agent.post('/api/chore-templates').send(data)
  }

  async updateTemplate(id: number, data: {
    title?: string
    description?: string
    points?: number
    icon?: string
    color?: string
    categoryId?: number
  }) {
    return this.agent.put(`/api/chore-templates/${id}`).send(data)
  }

  async deleteTemplate(id: number) {
    return this.agent.delete(`/api/chore-templates/${id}`)
  }

  // ============================================
  // Chore Assignments Endpoints
  // ============================================

  async getAssignments(filters?: {
    status?: string
    assignedToId?: number
    dueDateFrom?: string
    dueDateTo?: string
  }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString()
    return this.agent.get(`/api/chore-assignments${query ? `?${query}` : ''}`)
  }

  async getAssignment(id: number) {
    return this.agent.get(`/api/chore-assignments/${id}`)
  }

  async createAssignment(data: {
    choreTemplateId: number
    assignedToId: number
    dueDate: string
    notes?: string
  }) {
    return this.agent.post('/api/chore-assignments').send(data)
  }

  async updateAssignment(id: number, data: {
    dueDate?: string
    notes?: string
    assignedToId?: number
  }) {
    return this.agent.put(`/api/chore-assignments/${id}`).send(data)
  }

  async deleteAssignment(id: number) {
    return this.agent.delete(`/api/chore-assignments/${id}`)
  }

  async completeAssignment(id: number, data?: {
    notes?: string
    partialPoints?: number
  }) {
    return this.agent.post(`/api/chore-assignments/${id}/complete`).send(data || {})
  }

  async getCalendar(startDate: string, endDate: string) {
    return this.agent.get(`/api/chore-assignments/calendar?startDate=${startDate}&endDate=${endDate}`)
  }

  // ============================================
  // Chore Categories Endpoints
  // ============================================

  async getCategories() {
    return this.agent.get('/api/chore-categories')
  }

  async createCategory(data: {
    name: string
    description?: string
    icon?: string
    color?: string
  }) {
    return this.agent.post('/api/chore-categories').send(data)
  }

  async updateCategory(id: number, data: {
    name?: string
    description?: string
    icon?: string
    color?: string
  }) {
    return this.agent.put(`/api/chore-categories/${id}`).send(data)
  }

  async deleteCategory(id: number) {
    return this.agent.delete(`/api/chore-categories/${id}`)
  }

  // ============================================
  // Recurring Chores Endpoints
  // ============================================

  async getRecurringChores(includeInactive = false) {
    return this.agent.get(`/api/recurring-chores?includeInactive=${includeInactive}`)
  }

  async getRecurringChore(id: number) {
    return this.agent.get(`/api/recurring-chores/${id}`)
  }

  async createRecurringChore(data: {
    title: string
    description?: string
    points: number
    icon?: string
    color?: string
    categoryId?: number
    startDate: string
    recurrenceRule: object
    assignmentMode: 'FIXED' | 'ROUND_ROBIN'
    fixedAssigneeIds?: number[]
    roundRobinPoolIds?: number[]
  }) {
    return this.agent.post('/api/recurring-chores').send(data)
  }

  async updateRecurringChore(id: number, data: {
    title?: string
    description?: string
    points?: number
    icon?: string
    color?: string
    categoryId?: number
    startDate?: string
    recurrenceRule?: object
    assignmentMode?: 'FIXED' | 'ROUND_ROBIN'
    fixedAssigneeIds?: number[]
    roundRobinPoolIds?: number[]
    isActive?: boolean
  }) {
    return this.agent.put(`/api/recurring-chores/${id}`).send(data)
  }

  async deleteRecurringChore(id: number) {
    return this.agent.delete(`/api/recurring-chores/${id}`)
  }

  async getOccurrences(recurringChoreId: number, startDate: string, endDate: string) {
    return this.agent.get(
      `/api/recurring-chores/${recurringChoreId}/occurrences?startDate=${startDate}&endDate=${endDate}`
    )
  }

  async completeOccurrence(recurringChoreId: number, occurrenceId: number, data?: {
    notes?: string
    partialPoints?: number
  }) {
    return this.agent
      .post(`/api/recurring-chores/${recurringChoreId}/occurrences/${occurrenceId}/complete`)
      .send(data || {})
  }

  async skipOccurrence(recurringChoreId: number, occurrenceId: number, reason?: string) {
    return this.agent
      .post(`/api/recurring-chores/${recurringChoreId}/occurrences/${occurrenceId}/skip`)
      .send({ reason })
  }

  // ============================================
  // Pocket Money Endpoints
  // ============================================

  async getBalance(userId?: number) {
    // API uses path param: /api/pocket-money/balance/:userId
    // If no userId provided, use current user's ID
    const targetUserId = userId ?? this.currentUser?.id
    if (!targetUserId) {
      // Return a mock response for unauthenticated tests
      return this.agent.get('/api/pocket-money/balance/0')
    }
    return this.agent.get(`/api/pocket-money/balance/${targetUserId}`)
  }

  async getTransactions(userId?: number, limit?: number) {
    // API uses path param: /api/pocket-money/transactions/:userId
    const targetUserId = userId ?? this.currentUser?.id
    if (!targetUserId) {
      throw new Error('No user ID available for getTransactions')
    }
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    const query = params.toString()
    return this.agent.get(`/api/pocket-money/transactions/${targetUserId}${query ? `?${query}` : ''}`)
  }

  async addBonus(data: {
    userId: number
    amount: number
    description?: string
  }) {
    return this.agent.post('/api/pocket-money/bonus').send(data)
  }

  async addDeduction(data: {
    userId: number
    amount: number
    description?: string
  }) {
    return this.agent.post('/api/pocket-money/deduction').send(data)
  }

  async createPayout(data: {
    userId: number
    points: number
    periodStart: string
    periodEnd: string
  }) {
    return this.agent.post('/api/pocket-money/payout').send(data)
  }

  async getPayouts(userId?: number) {
    const targetUserId = userId ?? this.currentUser?.id
    if (!targetUserId) {
      throw new Error('No user ID available for getPayouts')
    }
    return this.agent.get(`/api/pocket-money/payouts/${targetUserId}`)
  }

  /**
   * Add a transaction (routes to appropriate endpoint based on type)
   * BONUS -> /api/pocket-money/bonus
   * ADJUSTMENT/DEDUCTION -> /api/pocket-money/deduction
   * PAYOUT -> /api/pocket-money/payout
   */
  async addTransaction(data: {
    userId: number
    type: 'BONUS' | 'ADJUSTMENT' | 'DEDUCTION' | 'PAYOUT'
    amount: number
    description?: string
    points?: number
    periodStart?: string
    periodEnd?: string
  }) {
    if (data.type === 'BONUS') {
      return this.addBonus({
        userId: data.userId,
        amount: data.amount,
        description: data.description,
      })
    } else if (data.type === 'ADJUSTMENT' || data.type === 'DEDUCTION') {
      return this.addDeduction({
        userId: data.userId,
        amount: Math.abs(data.amount),
        description: data.description,
      })
    } else if (data.type === 'PAYOUT') {
      return this.createPayout({
        userId: data.userId,
        points: data.points ?? data.amount,
        periodStart: data.periodStart ?? new Date().toISOString().split('T')[0],
        periodEnd: data.periodEnd ?? new Date().toISOString().split('T')[0],
      })
    }
    throw new Error(`Unknown transaction type: ${data.type}`)
  }

  // ============================================
  // Notification Settings Endpoints
  // ============================================

  async getNotificationSettings() {
    return this.agent.get('/api/notification-settings')
  }

  async updateNotificationSettings(data: {
    ntfyTopic?: string
    ntfyServerUrl?: string
    ntfyUsername?: string
    ntfyPassword?: string
    notifyChoreAssigned?: boolean
    notifyChoreDueSoon?: boolean
    notifyChoreCompleted?: boolean
    notifyChoreOverdue?: boolean
    notifyPointsEarned?: boolean
    reminderHoursBefore?: number
    quietHoursStart?: string
    quietHoursEnd?: string
  }) {
    return this.agent.put('/api/notification-settings').send(data)
  }

  // ============================================
  // Health Endpoints
  // ============================================

  async getHealth() {
    return this.agent.get('/api/health')
  }

  async getLiveness() {
    return this.agent.get('/api/health/live')
  }

  async getReadiness() {
    return this.agent.get('/api/health/ready')
  }
}

/**
 * Create a new API client
 */
export function createApiClient(): ApiClient {
  const app = createTestApp()
  return new ApiClient(app)
}
