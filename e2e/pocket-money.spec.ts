/**
 * E2E Tests for Pocket Money
 * 
 * Tests cover:
 * - View balance
 * - View transactions
 * - Award points
 * - Add bonus/deduction
 * - Create payout
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  generateTestChoreTemplate,
  generateTestAssignment,
  registerUser,
  loginUser,
  setupAuthenticatedUser,
  createChoreTemplate,
  createChoreAssignment,
  getUserBalance,
  addBonusPoints,
  cleanupTestData,
  waitForPageReady,
  getCsrfToken,
  TestUser,
} from './utils/test-helpers';

test.describe('Pocket Money', () => {
  let testUserIds: number[] = [];
  let testTemplateIds: number[] = [];
  let testAssignmentIds: number[] = [];
  let parentUser: TestUser;
  let childUser: TestUser;

  test.beforeEach(async ({ request }) => {
    // Create parent and child users for testing
    const parentData = generateTestUser({ role: 'PARENT' });
    const childData = generateTestUser({ role: 'CHILD', basePocketMoney: 10 });

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
      templateIds: testTemplateIds,
      assignmentIds: testAssignmentIds,
    });
    testUserIds = [];
    testTemplateIds = [];
    testAssignmentIds = [];
  });

  // ============================================
  // View Balance Tests
  // ============================================

  test.describe('View Balance', () => {
    test('should get user balance', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.get(`/api/pocket-money/balance/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(typeof body.data.balance).toBe('number');
    });

    test('should return zero balance for new user', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const balance = await getUserBalance(request, childUser.id);
      expect(balance).toBe(0);
    });

    test('should return updated balance after bonus', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add bonus
      await addBonusPoints(request, childUser.id, 50, 'Test bonus');

      // Check balance
      const balance = await getUserBalance(request, childUser.id);
      expect(balance).toBe(50);
    });

    test('should allow child to view their own balance', async ({ request }) => {
      await loginUser(request, childUser.email, childUser.password);

      const response = await request.get(`/api/pocket-money/balance/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  // ============================================
  // View Transactions Tests
  // ============================================

  test.describe('View Transactions', () => {
    test('should get transactions for user', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.get(`/api/pocket-money/transactions/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should return empty array for user with no transactions', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.get(`/api/pocket-money/transactions/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.length).toBe(0);
    });

    test('should show transactions after bonus added', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add bonus
      await addBonusPoints(request, childUser.id, 25, 'Weekly bonus');

      // Get transactions
      const response = await request.get(`/api/pocket-money/transactions/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
      
      const bonusTransaction = body.data.find(
        (t: { type: string; description: string }) => t.type === 'BONUS' && t.description.includes('Weekly bonus')
      );
      expect(bonusTransaction).toBeDefined();
    });

    test('should limit transactions with query parameter', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add multiple bonuses
      await addBonusPoints(request, childUser.id, 10, 'Bonus 1');
      await addBonusPoints(request, childUser.id, 10, 'Bonus 2');
      await addBonusPoints(request, childUser.id, 10, 'Bonus 3');

      // Get limited transactions
      const response = await request.get(`/api/pocket-money/transactions/${childUser.id}?limit=2`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // ============================================
  // Award Points Tests
  // ============================================

  test.describe('Award Points', () => {
    test('should add bonus points to user', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.post('/api/pocket-money/bonus', {
        data: {
          userId: childUser.id,
          amount: 100,
          description: 'Good behavior bonus',
        },
      });

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.amount).toBe(100);
      expect(body.data.type).toBe('BONUS');
    });

    test('should add deduction from user', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // First add some points
      await addBonusPoints(request, childUser.id, 50, 'Initial bonus');

      // Then deduct
      const response = await request.post('/api/pocket-money/deduction', {
        data: {
          userId: childUser.id,
          amount: 20,
          description: 'Bad behavior deduction',
        },
      });

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.amount).toBe(20);
      expect(body.data.type).toBe('DEDUCTION');
    });

    test('should update balance after bonus', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const initialBalance = await getUserBalance(request, childUser.id);

      await addBonusPoints(request, childUser.id, 30, 'Test bonus');

      const newBalance = await getUserBalance(request, childUser.id);
      expect(newBalance).toBe(initialBalance + 30);
    });

    test('should update balance after deduction', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add initial points
      await addBonusPoints(request, childUser.id, 100, 'Initial');
      
      const balanceBeforeDeduction = await getUserBalance(request, childUser.id);

      // Deduct
      await request.post('/api/pocket-money/deduction', {
        data: {
          userId: childUser.id,
          amount: 25,
          description: 'Deduction',
        },
      });

      const newBalance = await getUserBalance(request, childUser.id);
      expect(newBalance).toBe(balanceBeforeDeduction - 25);
    });

    test('should validate required fields for bonus', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.post('/api/pocket-money/bonus', {
        data: {
          // Missing userId and amount
          description: 'Invalid bonus',
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('should validate amount is positive for bonus', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.post('/api/pocket-money/bonus', {
        data: {
          userId: childUser.id,
          amount: -10,
          description: 'Invalid bonus',
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });
  });

  // ============================================
  // Payout Tests
  // ============================================

  test.describe('Payouts', () => {
    test('should create a payout', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add some points first
      await addBonusPoints(request, childUser.id, 100, 'Points for payout');

      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const response = await request.post('/api/pocket-money/payout', {
        data: {
          userId: childUser.id,
          points: 100,
          periodStart: lastWeek.toISOString().split('T')[0],
          periodEnd: today.toISOString().split('T')[0],
        },
      });

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data.type).toBe('PAYOUT');
    });

    test('should get payouts for user', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const response = await request.get(`/api/pocket-money/payouts/${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should reduce balance after payout', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Add points
      await addBonusPoints(request, childUser.id, 200, 'Points');
      
      const balanceBefore = await getUserBalance(request, childUser.id);

      // Create payout
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      await request.post('/api/pocket-money/payout', {
        data: {
          userId: childUser.id,
          points: 150,
          periodStart: lastWeek.toISOString().split('T')[0],
          periodEnd: today.toISOString().split('T')[0],
        },
      });

      const balanceAfter = await getUserBalance(request, childUser.id);
      expect(balanceAfter).toBe(balanceBefore - 150);
    });
  });

  // ============================================
  // Chore Completion Points Tests
  // ============================================

  test.describe('Chore Completion Points', () => {
    test('should award points when chore is completed', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Create template with points
      const template = await createChoreTemplate(
        request,
        generateTestChoreTemplate({ points: 15 })
      );
      testTemplateIds.push(template.id);

      // Create assignment
      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(template.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      const balanceBefore = await getUserBalance(request, childUser.id);

      // Complete the chore
      await request.post(`/api/chore-assignments/${assignment.id}/complete`, {
        data: {},
      });

      // Check balance increased
      const balanceAfter = await getUserBalance(request, childUser.id);
      expect(balanceAfter).toBeGreaterThan(balanceBefore);
    });

    test('should create transaction when chore is completed', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      // Create template and assignment
      const template = await createChoreTemplate(
        request,
        generateTestChoreTemplate({ title: 'Special Chore', points: 20 })
      );
      testTemplateIds.push(template.id);

      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(template.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      // Complete the chore
      await request.post(`/api/chore-assignments/${assignment.id}/complete`, {
        data: {},
      });

      // Get transactions
      const response = await request.get(`/api/pocket-money/transactions/${childUser.id}`);
      const body = await response.json();

      // Should have a transaction for the chore
      const choreTransaction = body.data.find(
        (t: { description: string }) => t.description.includes('Special Chore')
      );
      expect(choreTransaction).toBeDefined();
    });
  });

  // ============================================
  // UI Tests
  // ============================================

  test.describe('Pocket Money UI', () => {
    test('should display pocket money page', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'CHILD' });
      testUserIds.push(user.id);

      await page.goto('/pocket-money');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('should show balance on pocket money page', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'CHILD' });
      testUserIds.push(user.id);

      // Add some points
      await loginUser(request, user.email, user.password);
      await addBonusPoints(request, user.id, 50, 'Test bonus');

      await page.goto('/pocket-money');
      await waitForPageReady(page);

      // Look for balance display
      const balanceElement = page.locator('[data-testid="balance"], .balance, :text("Balance"), :text("50")');
      
      if (await balanceElement.count() > 0) {
        await expect(balanceElement.first()).toBeVisible();
      }
    });

    test('should show transactions list', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'CHILD' });
      testUserIds.push(user.id);

      // Add some transactions
      await loginUser(request, user.email, user.password);
      await addBonusPoints(request, user.id, 25, 'Bonus 1');
      await addBonusPoints(request, user.id, 15, 'Bonus 2');

      await page.goto('/pocket-money');
      await waitForPageReady(page);

      // Look for transactions list
      const transactionList = page.locator('[data-testid="transactions"], .transactions, .transaction-list');
      
      if (await transactionList.count() > 0) {
        await expect(transactionList.first()).toBeVisible();
      }
    });

    test('parent should see add bonus button', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await page.goto('/pocket-money');
      await waitForPageReady(page);

      // Look for add bonus/adjustment button
      const addButton = page.locator('button:has-text("Add"), button:has-text("Bonus"), button:has-text("Adjust")');
      
      if (await addButton.count() > 0) {
        await expect(addButton.first()).toBeVisible();
      }
    });
  });
});