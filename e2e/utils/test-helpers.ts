/**
 * E2E Test Helpers for Chore-Ganizer
 * 
 * Provides utilities for authentication, test data generation,
 * and API interactions for Playwright E2E tests.
 */

import { Page, APIRequestContext, expect, APIResponse } from '@playwright/test';

// ============================================
// Types
// ============================================

export interface TestUser {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'PARENT' | 'CHILD';
  color?: string;
  basePocketMoney?: number;
  points?: number;
}

export interface CsrfTokens {
  csrfToken: string;
  cookies: string;
}

export interface TestChoreTemplate {
  id: number;
  title: string;
  description?: string;
  points: number;
  icon?: string;
  color?: string;
}

export interface TestChoreAssignment {
  id: number;
  choreTemplateId: number;
  assignedToId: number;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  notes?: string;
}

export interface TestRecurringChore {
  id: number;
  title: string;
  description?: string;
  points: number;
  icon?: string;
  color?: string;
  startDate: string;
  recurrenceRule: object;
  assignmentMode: 'FIXED' | 'ROUND_ROBIN';
  isActive: boolean;
}

// ============================================
// Test Data Generators
// ============================================

let userCounter = 0;
let templateCounter = 0;
let assignmentCounter = 0;

/**
 * Generate unique test user data
 */
export function generateTestUser(overrides: Partial<TestUser> = {}): Omit<TestUser, 'id'> {
  userCounter++;
  const role = overrides.role || (userCounter % 2 === 0 ? 'PARENT' : 'CHILD');
  return {
    email: `test-user-${Date.now()}-${userCounter}@test.example.com`,
    password: 'TestPassword123!',
    name: `Test User ${userCounter}`,
    role,
    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    basePocketMoney: role === 'CHILD' ? 10 : undefined,
    points: 0,
    ...overrides,
  };
}

/**
 * Generate test chore template data
 */
export function generateTestChoreTemplate(overrides: Partial<TestChoreTemplate> = {}): Omit<TestChoreTemplate, 'id'> {
  templateCounter++;
  return {
    title: `Test Chore ${templateCounter}`,
    description: `Description for test chore ${templateCounter}`,
    points: Math.floor(Math.random() * 20) + 5,
    icon: '🧹',
    color: '#3B82F6',
    ...overrides,
  };
}

/**
 * Generate test chore assignment data
 */
export function generateTestAssignment(
  choreTemplateId: number,
  assignedToId: number,
  overrides: Partial<TestChoreAssignment> = {}
): Omit<TestChoreAssignment, 'id'> {
  assignmentCounter++;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    choreTemplateId,
    assignedToId,
    dueDate: tomorrow.toISOString().split('T')[0],
    status: 'PENDING',
    notes: `Test assignment ${assignmentCounter}`,
    ...overrides,
  };
}

/**
 * Generate test recurring chore data
 */
export function generateTestRecurringChore(overrides: Partial<TestRecurringChore> = {}): Omit<TestRecurringChore, 'id'> {
  return {
    title: `Recurring Chore ${Date.now()}`,
    description: 'Test recurring chore description',
    points: 10,
    icon: '🔄',
    color: '#10B981',
    startDate: new Date().toISOString().split('T')[0],
    recurrenceRule: {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'WE', 'FR'],
    },
    assignmentMode: 'ROUND_ROBIN',
    isActive: true,
    ...overrides,
  };
}

// ============================================
// Authentication Helpers
// ============================================

/**
 * Get CSRF token from the server
 * Note: Playwright's request context maintains cookies automatically
 */
export async function getCsrfToken(request: APIRequestContext): Promise<CsrfTokens> {
  const response = await request.get('/api/csrf-token');
  
  if (!response.ok()) {
    throw new Error(`Failed to get CSRF token: ${response.status()}`);
  }
  
  const body = await response.json();
  // Playwright's request context maintains cookies automatically
  // No need to manually extract and pass them
  
  return {
    csrfToken: body.csrfToken,
    cookies: '', // Not needed - Playwright handles cookies
  };
}

/**
 * Register a new user via API
 */
export async function registerUser(
  request: APIRequestContext,
  userData: Omit<TestUser, 'id'>
): Promise<{ user: TestUser; response: APIResponse }> {
  // Get CSRF token first
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/users', {
    data: {
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role,
      color: userData.color,
      basePocketMoney: userData.basePocketMoney,
    },
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to register user: ${response.status()} - ${body}`);
  }

  const body = await response.json();
  return {
    user: {
      ...userData,
      id: body.data.id,
    },
    response,
  };
}

/**
 * Login via API and return session cookies
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ cookies: string; response: APIResponse }> {
  // Get CSRF token first
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/auth/login', {
    data: { email, password },
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to login: ${response.status()} - ${body}`);
  }

  // Extract cookies from response
  const cookies = response.headers()['set-cookie'] || '';
  
  return {
    cookies: Array.isArray(cookies) ? cookies.join('; ') : cookies,
    response,
  };
}

/**
 * Login via UI (page interactions)
 */
export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
  
  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|chores|home)/, { timeout: 10000 }).catch(() => {
    // If no redirect, check for error message
    return page.waitForSelector('.error, [role="alert"]', { timeout: 2000 });
  });
}

/**
 * Logout via UI
 */
export async function logoutViaUI(page: Page): Promise<void> {
  // Look for logout button/link in various common locations
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
    'a:has-text("Logout")',
    'a:has-text("Sign out")',
    '[data-testid="logout-button"]',
    '[data-testid="signout-button"]',
  ];

  for (const selector of logoutSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      await element.click();
      await page.waitForURL('/login', { timeout: 5000 }).catch(() => {});
      return;
    }
  }

  // If no logout button found, try clearing session via API
  await page.request.post('/api/auth/logout');
}

/**
 * Register and login a test user in one step
 */
export async function setupAuthenticatedUser(
  request: APIRequestContext,
  page: Page,
  userData?: Partial<TestUser>
): Promise<TestUser> {
  // Generate user data
  const testUser = generateTestUser(userData);
  
  // Register the user
  const { user } = await registerUser(request, testUser);
  
  // Login via UI
  await loginViaUI(page, user.email, user.password);
  
  return user;
}

// ============================================
// API Helpers
// ============================================

/**
 * Create a chore template via API
 */
export async function createChoreTemplate(
  request: APIRequestContext,
  template: Omit<TestChoreTemplate, 'id'>
): Promise<TestChoreTemplate> {
  // Get CSRF token
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/chore-templates', {
    data: template,
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create chore template: ${response.status()} - ${body}`);
  }

  const body = await response.json();
  return {
    ...template,
    id: body.data.id,
  };
}

/**
 * Create a chore assignment via API
 */
export async function createChoreAssignment(
  request: APIRequestContext,
  assignment: Omit<TestChoreAssignment, 'id'>
): Promise<TestChoreAssignment> {
  // Get CSRF token
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/chore-assignments', {
    data: assignment,
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create chore assignment: ${response.status()} - ${body}`);
  }

  const body = await response.json();
  return {
    ...assignment,
    id: body.data.id,
  };
}

/**
 * Create a recurring chore via API
 */
export async function createRecurringChore(
  request: APIRequestContext,
  recurringChore: Omit<TestRecurringChore, 'id'>
): Promise<TestRecurringChore> {
  // Get CSRF token
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/recurring-chores', {
    data: recurringChore,
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create recurring chore: ${response.status()} - ${body}`);
  }

  const body = await response.json();
  return {
    ...recurringChore,
    id: body.data.id,
  };
}

/**
 * Get user balance via API
 */
export async function getUserBalance(
  request: APIRequestContext,
  userId: number
): Promise<number> {
  const response = await request.get(`/api/pocket-money/balance/${userId}`);

  if (!response.ok()) {
    return 0;
  }

  const body = await response.json();
  return body.data?.balance || 0;
}

/**
 * Add bonus points via API
 */
export async function addBonusPoints(
  request: APIRequestContext,
  userId: number,
  amount: number,
  description?: string
): Promise<void> {
  // Get CSRF token
  const { csrfToken } = await getCsrfToken(request);
  
  const response = await request.post('/api/pocket-money/bonus', {
    data: {
      userId,
      amount,
      description: description || 'Test bonus',
    },
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to add bonus: ${response.status()} - ${body}`);
  }
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that an element is visible within timeout
 */
export async function assertElementVisible(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Assert that an element contains text
 */
export async function assertElementText(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * Assert user is redirected to login page
 */
export async function assertRedirectedToLogin(page: Page): Promise<void> {
  await page.waitForURL(/\/login/, { timeout: 5000 });
  expect(page.url()).toContain('/login');
}

/**
 * Assert user is authenticated (on protected page)
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Should not be on login page
  expect(page.url()).not.toContain('/login');
  
  // Should have user info visible somewhere
  const userIndicators = [
    '[data-testid="user-menu"]',
    '[data-testid="user-name"]',
    '.user-profile',
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
  ];

  let found = false;
  for (const selector of userIndicators) {
    if (await page.locator(selector).isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }

  expect(found).toBe(true);
}

// ============================================
// Cleanup Helpers
// ============================================

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(
  request: APIRequestContext,
  options: {
    userIds?: number[];
    templateIds?: number[];
    assignmentIds?: number[];
    recurringChoreIds?: number[];
  }
): Promise<void> {
  const { userIds = [], templateIds = [], assignmentIds = [], recurringChoreIds = [] } = options;

  // Delete assignments first (they depend on templates and users)
  for (const id of assignmentIds) {
    await request.delete(`/api/chore-assignments/${id}`).catch(() => {});
  }

  // Delete recurring chores
  for (const id of recurringChoreIds) {
    await request.delete(`/api/recurring-chores/${id}`).catch(() => {});
  }

  // Delete templates
  for (const id of templateIds) {
    await request.delete(`/api/chore-templates/${id}`).catch(() => {});
  }

  // Delete users last
  for (const id of userIds) {
    await request.delete(`/api/users/${id}`).catch(() => {});
  }
}

// ============================================
// Wait Helpers
// ============================================

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Wait for page to be ready (no loading indicators)
 */
export async function waitForPageReady(page: Page, timeout = 10000): Promise<void> {
  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '.loading',
    '[data-testid="loading"]',
    '.spinner',
    '[role="progressbar"]',
  ];

  for (const selector of loadingSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      await element.waitFor({ state: 'hidden', timeout }).catch(() => {});
    }
  }

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}
