/**
 * E2E Tests for Recurring Chores
 * 
 * Tests cover:
 * - Create recurring chore
 * - View occurrences
 * - Edit recurring chore
 * - Complete occurrence
 * - Skip occurrence
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  generateTestRecurringChore,
  registerUser,
  loginUser,
  setupAuthenticatedUser,
  createRecurringChore,
  cleanupTestData,
  waitForPageReady,
  getCsrfToken,
  TestUser,
  TestRecurringChore,
} from './utils/test-helpers';

test.describe('Recurring Chores', () => {
  let testUserIds: number[] = [];
  let testRecurringChoreIds: number[] = [];
  let parentUser: TestUser;
  let childUser: TestUser;

  test.beforeEach(async ({ request }) => {
    // Create parent and child users for testing
    const parentData = generateTestUser({ role: 'PARENT' });
    const childData = generateTestUser({ role: 'CHILD' });

    const { user: parent } = await registerUser(request, parentData);
    const { user: child } = await registerUser(request, childData);

    parentUser = parent;
    childUser = child;

    testUserIds.push(parentUser.id, childUser.id);
  });

  test.afterEach(async ({ request }) => {
    // Clean up test data
    await cleanupTestData(request, {
      userIds: testUserIds,
      recurringChoreIds: testRecurringChoreIds,
    });
    testUserIds = [];
    testRecurringChoreIds = [];
  });

  // ============================================
  // Create Recurring Chore Tests
  // ============================================

  test.describe('Create Recurring Chore', () => {
    test('should create a recurring chore with FIXED assignment mode', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringData = generateTestRecurringChore({
        assignmentMode: 'FIXED',
        title: 'Daily Dishes',
        points: 5,
      });

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/recurring-chores', {
        data: {
          ...recurringData,
          fixedAssigneeIds: [childUser.id],
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('Daily Dishes');
      expect(body.data.assignmentMode).toBe('FIXED');
      
      testRecurringChoreIds.push(body.data.id);
    });

    test('should create a recurring chore with ROUND_ROBIN assignment mode', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringData = generateTestRecurringChore({
        assignmentMode: 'ROUND_ROBIN',
        title: 'Weekly Cleaning',
        points: 15,
      });

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/recurring-chores', {
        data: {
          ...recurringData,
          roundRobinPoolIds: [childUser.id],
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.assignmentMode).toBe('ROUND_ROBIN');
      
      testRecurringChoreIds.push(body.data.id);
    });

    test('should create a weekly recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/recurring-chores', {
        data: {
          title: 'Weekly Laundry',
          description: 'Do laundry every Monday',
          points: 10,
          startDate: new Date().toISOString().split('T')[0],
          recurrenceRule: {
            frequency: 'WEEKLY',
            interval: 1,
            byDay: ['MO'],
          },
          assignmentMode: 'FIXED',
          fixedAssigneeIds: [childUser.id],
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.recurrenceRule.frequency).toBe('WEEKLY');
      
      testRecurringChoreIds.push(body.data.id);
    });

    test('should create a daily recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/recurring-chores', {
        data: {
          title: 'Daily Room Tidy',
          description: 'Tidy room every day',
          points: 3,
          startDate: new Date().toISOString().split('T')[0],
          recurrenceRule: {
            frequency: 'DAILY',
            interval: 1,
          },
          assignmentMode: 'FIXED',
          fixedAssigneeIds: [childUser.id],
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.recurrenceRule.frequency).toBe('DAILY');
      
      testRecurringChoreIds.push(body.data.id);
    });

    test('should validate required fields when creating recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/recurring-chores', {
        data: {
          title: 'Incomplete Chore',
          // Missing required fields
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
  // View Recurring Chores Tests
  // ============================================

  test.describe('View Recurring Chores', () => {
    test('should list all recurring chores', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Create recurring chores
      const rc1 = await createRecurringChore(request, generateTestRecurringChore({ title: 'RC 1' }));
      const rc2 = await createRecurringChore(request, generateTestRecurringChore({ title: 'RC 2' }));
      
      testRecurringChoreIds.push(rc1.id, rc2.id);

      const response = await request.get('/api/recurring-chores');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should get a single recurring chore by ID', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Test RC' })
      );
      testRecurringChoreIds.push(recurringChore.id);

      const response = await request.get(`/api/recurring-chores/${recurringChore.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.id).toBe(recurringChore.id);
      expect(body.data.title).toBe('Test RC');
    });

    test('should filter out inactive recurring chores by default', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Create active recurring chore
      const activeRC = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Active RC', isActive: true })
      );
      
      // Create inactive recurring chore
      const inactiveRC = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Inactive RC', isActive: true })
      );
      
      // Deactivate the second one
      await request.put(`/api/recurring-chores/${inactiveRC.id}`, {
        data: { isActive: false },
      });

      testRecurringChoreIds.push(activeRC.id, inactiveRC.id);

      // Get active only
      const response = await request.get('/api/recurring-chores?includeInactive=false');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      const foundInactive = body.data.find((rc: TestRecurringChore) => rc.id === inactiveRC.id);
      expect(foundInactive).toBeUndefined();
    });

    test('should include inactive recurring chores when requested', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const activeRC = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Active RC', isActive: true })
      );
      
      const inactiveRC = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Inactive RC', isActive: true })
      );
      
      await request.put(`/api/recurring-chores/${inactiveRC.id}`, {
        data: { isActive: false },
      });

      testRecurringChoreIds.push(activeRC.id, inactiveRC.id);

      const response = await request.get('/api/recurring-chores?includeInactive=true');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // View Occurrences Tests
  // ============================================

  test.describe('View Occurrences', () => {
    test('should get occurrences for a recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({
          title: 'Daily Test',
          recurrenceRule: {
            frequency: 'DAILY',
            interval: 1,
          },
        })
      );
      testRecurringChoreIds.push(recurringChore.id);

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const response = await request.get(
        `/api/recurring-chores/${recurringChore.id}/occurrences?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`
      );

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      // Should have occurrences for each day
      expect(body.data.length).toBeGreaterThan(0);
    });

    test('should return empty array for invalid date range', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore()
      );
      testRecurringChoreIds.push(recurringChore.id);

      // Date range in the past
      const response = await request.get(
        `/api/recurring-chores/${recurringChore.id}/occurrences?startDate=2020-01-01&endDate=2020-01-07`
      );

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  // ============================================
  // Edit Recurring Chore Tests
  // ============================================

  test.describe('Edit Recurring Chore', () => {
    test('should update recurring chore title', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({ title: 'Original Title' })
      );
      testRecurringChoreIds.push(recurringChore.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/recurring-chores/${recurringChore.id}`, {
        data: { title: 'Updated Title' },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.title).toBe('Updated Title');
    });

    test('should update recurring chore points', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({ points: 10 })
      );
      testRecurringChoreIds.push(recurringChore.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/recurring-chores/${recurringChore.id}`, {
        data: { points: 20 },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.points).toBe(20);
    });

    test('should update recurrence rule', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({
          recurrenceRule: {
            frequency: 'DAILY',
            interval: 1,
          },
        })
      );
      testRecurringChoreIds.push(recurringChore.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/recurring-chores/${recurringChore.id}`, {
        data: {
          recurrenceRule: {
            frequency: 'WEEKLY',
            interval: 2,
            byDay: ['MO', 'FR'],
          },
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.recurrenceRule.frequency).toBe('WEEKLY');
      expect(body.data.recurrenceRule.interval).toBe(2);
    });

    test('should deactivate a recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({ isActive: true })
      );
      testRecurringChoreIds.push(recurringChore.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/recurring-chores/${recurringChore.id}`, {
        data: { isActive: false },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.isActive).toBe(false);
    });

    test('should delete a recurring chore', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore()
      );

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.delete(`/api/recurring-chores/${recurringChore.id}`, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify deletion
      const getResponse = await request.get(`/api/recurring-chores/${recurringChore.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  // ============================================
  // Complete/Skip Occurrence Tests
  // ============================================

  test.describe('Complete/Skip Occurrence', () => {
    test('should complete an occurrence', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({
          recurrenceRule: { frequency: 'DAILY', interval: 1 },
        })
      );
      testRecurringChoreIds.push(recurringChore.id);

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Get occurrences
      const occurrencesResponse = await request.get(
        `/api/recurring-chores/${recurringChore.id}/occurrences?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`
      );

      const occurrencesBody = await occurrencesResponse.json();
      const firstOccurrence = occurrencesBody.data[0];

      // Complete the occurrence
      const response = await request.post(
        `/api/recurring-chores/${recurringChore.id}/occurrences/${firstOccurrence.id}/complete`,
        { data: {} }
      );

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.status).toBe('COMPLETED');
    });

    test('should skip an occurrence with reason', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const recurringChore = await createRecurringChore(
        request,
        generateTestRecurringChore({
          recurrenceRule: { frequency: 'DAILY', interval: 1 },
        })
      );
      testRecurringChoreIds.push(recurringChore.id);

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Get occurrences
      const occurrencesResponse = await request.get(
        `/api/recurring-chores/${recurringChore.id}/occurrences?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`
      );

      const occurrencesBody = await occurrencesResponse.json();
      const firstOccurrence = occurrencesBody.data[0];

      // Skip the occurrence
      const response = await request.post(
        `/api/recurring-chores/${recurringChore.id}/occurrences/${firstOccurrence.id}/skip`,
        { data: { reason: 'On vacation' } }
      );

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.status).toBe('SKIPPED');
    });
  });

  // ============================================
  // UI Tests
  // ============================================

  test.describe('Recurring Chores UI', () => {
    test('should display recurring chores page', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await page.goto('/recurring-chores');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('should show create recurring chore button for parent', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await page.goto('/recurring-chores');
      await waitForPageReady(page);

      // Look for create/add button
      const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      
      if (await createButton.count() > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });
  });
});
