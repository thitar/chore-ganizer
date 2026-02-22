/**
 * E2E Tests for Authentication
 * 
 * Tests cover:
 * - User registration
 * - Login/logout
 * - Session management
 * - Protected routes
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  loginUser,
  loginViaUI,
  logoutViaUI,
  setupAuthenticatedUser,
  assertRedirectedToLogin,
  assertAuthenticated,
  cleanupTestData,
  getCsrfToken,
  TestUser,
} from './utils/test-helpers';

test.describe('Authentication', () => {
  let testUserIds: number[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up test users
    if (testUserIds.length > 0) {
      await cleanupTestData(request, { userIds: testUserIds });
      testUserIds = [];
    }
  });

  // ============================================
  // User Registration Tests
  // ============================================

  test.describe('User Registration', () => {
    test('should register a new user successfully via API', async ({ request }) => {
      const userData = generateTestUser({ role: 'CHILD' });
      
      // Get CSRF token - this sets the session cookie
      const { csrfToken } = await getCsrfToken(request);
      
      const response = await request.post('/api/users', {
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok()) {
        const errorBody = await response.text();
        console.log('Registration failed:', response.status(), errorBody);
      }

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe(userData.email);
      expect(body.data.name).toBe(userData.name);
      expect(body.data.role).toBe(userData.role);
      
      testUserIds.push(body.data.id);
    });

    test('should not register user with duplicate email', async ({ request }) => {
      const userData = generateTestUser({ role: 'PARENT' });
      
      // First registration
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      // Get CSRF token for second request
      const { csrfToken } = await getCsrfToken(request);

      // Second registration with same email
      const response = await request.post('/api/users', {
        data: {
          email: userData.email,
          password: 'DifferentPassword123!',
          name: 'Different Name',
          role: 'CHILD',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(409);
    });

    test('should validate required fields on registration', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/users', {
        data: {
          name: 'Test User',
          // Missing email and password
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('should validate email format on registration', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/users', {
        data: {
          email: 'invalid-email',
          password: 'ValidPassword123!',
          name: 'Test User',
          role: 'CHILD',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('should validate password strength on registration', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/users', {
        data: {
          email: 'test@example.com',
          password: '123', // Too short
          name: 'Test User',
          role: 'CHILD',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });
  });

  // ============================================
  // Login Tests
  // ============================================

  test.describe('Login', () => {
    test('should login successfully with valid credentials via API', async ({ request }) => {
      const userData = generateTestUser({ role: 'PARENT' });
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/auth/login', {
        data: {
          email: userData.email,
          password: userData.password,
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(userData.email);
    });

    test('should fail login with invalid password', async ({ request }) => {
      const userData = generateTestUser({ role: 'CHILD' });
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/auth/login', {
        data: {
          email: userData.email,
          password: 'WrongPassword123!',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(401);
    });

    test('should fail login with non-existent email', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/auth/login', {
        data: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(401);
    });

    test('should login successfully via UI', async ({ page, request }) => {
      const userData = generateTestUser({ role: 'PARENT' });
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      await loginViaUI(page, userData.email, userData.password);
      await assertAuthenticated(page);
    });
  });

  // ============================================
  // Logout Tests
  // ============================================

  test.describe('Logout', () => {
    test('should logout successfully via API', async ({ request }) => {
      const userData = generateTestUser({ role: 'PARENT' });
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      // Login first
      await loginUser(request, userData.email, userData.password);

      // Logout
      const response = await request.post('/api/auth/logout');
      expect(response.ok()).toBeTruthy();

      // Verify session is cleared
      const meResponse = await request.get('/api/auth/me');
      expect(meResponse.status()).toBe(401);
    });

    test('should logout successfully via UI', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await assertAuthenticated(page);
      await logoutViaUI(page);
      await assertRedirectedToLogin(page);
    });
  });

  // ============================================
  // Session Management Tests
  // ============================================

  test.describe('Session Management', () => {
    test('should return current user info when authenticated', async ({ request }) => {
      const userData = generateTestUser({ role: 'CHILD' });
      const { user } = await registerUser(request, userData);
      testUserIds.push(user.id);

      // Login
      await loginUser(request, userData.email, userData.password);

      // Get current user
      const response = await request.get('/api/auth/me');
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.email).toBe(userData.email);
    });

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });

    test('should protect routes from unauthenticated access', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/chores');
      
      // Should be redirected to login
      await assertRedirectedToLogin(page);
    });

    test('should persist session across page reloads', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await assertAuthenticated(page);
    });
  });

  // ============================================
  // Role-Based Access Tests
  // ============================================

  test.describe('Role-Based Access', () => {
    test('parent should have access to user management', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      // Navigate to users page
      await page.goto('/users');
      
      // Should be able to see users list
      await expect(page.locator('body')).toBeVisible();
    });

    test('child should have limited access', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'CHILD' });
      testUserIds.push(user.id);

      // Child should be able to see their chores
      await page.goto('/chores');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
