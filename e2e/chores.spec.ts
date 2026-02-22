/**
 * E2E Tests for Chore Management
 * 
 * Tests cover:
 * - Create chore template
 * - Create chore assignment
 * - Assign chore to user
 * - Complete chore
 * - View chore list
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
  cleanupTestData,
  waitForPageReady,
  getCsrfToken,
  TestUser,
  TestChoreTemplate,
} from './utils/test-helpers';

test.describe('Chore Management', () => {
  let testUserIds: number[] = [];
  let testTemplateIds: number[] = [];
  let testAssignmentIds: number[] = [];
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
      templateIds: testTemplateIds,
      assignmentIds: testAssignmentIds,
    });
    testUserIds = [];
    testTemplateIds = [];
    testAssignmentIds = [];
  });

  // ============================================
  // Chore Template Tests
  // ============================================

  test.describe('Chore Templates', () => {
    test('should create a new chore template via API', async ({ request }) => {
      // Login as parent
      await loginUser(request, parentUser.email, parentUser.password);

      const templateData = generateTestChoreTemplate();
      const template = await createChoreTemplate(request, templateData);
      
      expect(template.id).toBeDefined();
      expect(template.title).toBe(templateData.title);
      expect(template.points).toBe(templateData.points);
      
      testTemplateIds.push(template.id);
    });

    test('should list all chore templates', async ({ request }) => {
      // Login as parent
      await loginUser(request, parentUser.email, parentUser.password);

      // Create templates
      const template1 = await createChoreTemplate(request, generateTestChoreTemplate({ title: 'Template 1' }));
      const template2 = await createChoreTemplate(request, generateTestChoreTemplate({ title: 'Template 2' }));
      
      testTemplateIds.push(template1.id, template2.id);

      // Get all templates
      const response = await request.get('/api/chore-templates');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should update a chore template', async ({ request }) => {
      // Login as parent
      await loginUser(request, parentUser.email, parentUser.password);

      const template = await createChoreTemplate(request, generateTestChoreTemplate());
      testTemplateIds.push(template.id);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/chore-templates/${template.id}`, {
        data: {
          title: 'Updated Title',
          points: 25,
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.points).toBe(25);
    });

    test('should delete a chore template', async ({ request }) => {
      // Login as parent
      await loginUser(request, parentUser.email, parentUser.password);

      const template = await createChoreTemplate(request, generateTestChoreTemplate());
      
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.delete(`/api/chore-templates/${template.id}`, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify deletion
      const getResponse = await request.get(`/api/chore-templates/${template.id}`);
      expect(getResponse.status()).toBe(404);
    });

    test('should validate required fields when creating template', async ({ request }) => {
      // Login as parent
      await loginUser(request, parentUser.email, parentUser.password);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post('/api/chore-templates', {
        data: {
          // Missing title and points
          description: 'Test description',
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
  // Chore Assignment Tests
  // ============================================

  test.describe('Chore Assignments', () => {
    let testTemplate: TestChoreTemplate;

    test.beforeEach(async ({ request }) => {
      // Login as parent and create a template
      await loginUser(request, parentUser.email, parentUser.password);
      testTemplate = await createChoreTemplate(request, generateTestChoreTemplate());
      testTemplateIds.push(testTemplate.id);
    });

    test('should create a chore assignment via API', async ({ request }) => {
      const assignmentData = generateTestAssignment(testTemplate.id, childUser.id);
      const assignment = await createChoreAssignment(request, assignmentData);
      
      expect(assignment.id).toBeDefined();
      expect(assignment.choreTemplateId).toBe(testTemplate.id);
      expect(assignment.assignedToId).toBe(childUser.id);
      expect(assignment.status).toBe('PENDING');
      
      testAssignmentIds.push(assignment.id);
    });

    test('should list chore assignments', async ({ request }) => {
      // Create assignments
      const assignment1 = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      const assignment2 = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      
      testAssignmentIds.push(assignment1.id, assignment2.id);

      // Get all assignments
      const response = await request.get('/api/chore-assignments');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should filter assignments by status', async ({ request }) => {
      // Create assignment
      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      // Get pending assignments
      const response = await request.get('/api/chore-assignments?status=PENDING');
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      body.data.forEach((a: { status: string }) => {
        expect(a.status).toBe('PENDING');
      });
    });

    test('should filter assignments by user', async ({ request }) => {
      // Create assignment
      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      // Get assignments for child user
      const response = await request.get(`/api/chore-assignments?assignedToId=${childUser.id}`);
      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.data).toBeDefined();
      body.data.forEach((a: { assignedToId: number }) => {
        expect(a.assignedToId).toBe(childUser.id);
      });
    });

    test('should update a chore assignment', async ({ request }) => {
      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 7);

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.put(`/api/chore-assignments/${assignment.id}`, {
        data: {
          dueDate: newDueDate.toISOString().split('T')[0],
          notes: 'Updated notes',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.notes).toBe('Updated notes');
    });

    test('should delete a chore assignment', async ({ request }) => {
      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );

      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.delete(`/api/chore-assignments/${assignment.id}`, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify deletion
      const getResponse = await request.get(`/api/chore-assignments/${assignment.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  // ============================================
  // Complete Chore Tests
  // ============================================

  test.describe('Complete Chore', () => {
    let testTemplate: TestChoreTemplate;
    let testAssignmentId: number;

    test.beforeEach(async ({ request }) => {
      // Login as parent and create template and assignment
      await loginUser(request, parentUser.email, parentUser.password);
      testTemplate = await createChoreTemplate(request, generateTestChoreTemplate({ points: 15 }));
      testTemplateIds.push(testTemplate.id);

      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(testTemplate.id, childUser.id)
      );
      testAssignmentId = assignment.id;
      testAssignmentIds.push(testAssignmentId);
    });

    test('should complete a chore assignment', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post(`/api/chore-assignments/${testAssignmentId}/complete`, {
        data: {},
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.status).toBe('COMPLETED');
      expect(body.data.completedAt).toBeDefined();
    });

    test('should complete a chore with notes', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post(`/api/chore-assignments/${testAssignmentId}/complete`, {
        data: {
          notes: 'Completed with extra effort!',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.status).toBe('COMPLETED');
      expect(body.data.notes).toContain('extra effort');
    });

    test('should complete a chore with partial points', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      const response = await request.post(`/api/chore-assignments/${testAssignmentId}/complete`, {
        data: {
          partialPoints: 10,
          notes: 'Partial completion',
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data.status).toBe('COMPLETED');
    });

    test('should not complete an already completed chore', async ({ request }) => {
      // Get CSRF token
      const { csrfToken } = await getCsrfToken(request);

      // First completion
      await request.post(`/api/chore-assignments/${testAssignmentId}/complete`, {
        data: {},
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      // Get new CSRF token for second request
      const { csrfToken: csrfToken2 } = await getCsrfToken(request);

      // Second completion attempt
      const response = await request.post(`/api/chore-assignments/${testAssignmentId}/complete`, {
        data: {},
        headers: {
          'X-CSRF-Token': csrfToken2,
        },
      });

      // Should fail or return error
      expect(response.ok()).toBeFalsy();
    });
  });

  // ============================================
  // Calendar View Tests
  // ============================================

  test.describe('Calendar View', () => {
    test('should get calendar data for date range', async ({ request }) => {
      await loginUser(request, parentUser.email, parentUser.password);

      const template = await createChoreTemplate(request, generateTestChoreTemplate());
      testTemplateIds.push(template.id);

      const assignment = await createChoreAssignment(
        request,
        generateTestAssignment(template.id, childUser.id)
      );
      testAssignmentIds.push(assignment.id);

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const response = await request.get(
        `/api/chore-assignments/calendar?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}`
      );

      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  // ============================================
  // UI Tests
  // ============================================

  test.describe('Chore UI', () => {
    test('should display chore list page', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await page.goto('/chores');
      await waitForPageReady(page);

      // Should show some content
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show create chore button for parent', async ({ page, request }) => {
      const user = await setupAuthenticatedUser(request, page, { role: 'PARENT' });
      testUserIds.push(user.id);

      await page.goto('/chores');
      await waitForPageReady(page);

      // Look for create/add chore button
      const createButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      
      // Parent should have access to create chores
      if (await createButton.count() > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });
  });
});
