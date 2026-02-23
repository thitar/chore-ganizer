# Chore-Ganizer Manual Testing Guide

## Version 2.0.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Test Environment Setup](#test-environment-setup)
3. [Parent Test Cases](#parent-test-cases)
   - [Authentication Tests](#parent-authentication-tests)
   - [User Management Tests](#user-management-tests)
   - [Chore Template Tests](#chore-template-tests)
   - [Chore Assignment Tests](#chore-assignment-tests)
   - [Recurring Chores Tests](#recurring-chores-tests)
   - [Pocket Money Tests](#pocket-money-tests)
   - [Statistics Dashboard Tests](#statistics-dashboard-tests)
   - [Notification Tests](#notification-tests)
   - [PWA Tests](#pwa-tests-parent)
   - [Settings Tests](#settings-tests)
4. [Child Test Cases](#child-test-cases)
   - [Authentication Tests](#child-authentication-tests)
   - [Chore Viewing Tests](#chore-viewing-tests)
   - [Chore Completion Tests](#chore-completion-tests)
   - [Points/Pocket Money Tests](#pointspocket-money-tests)
   - [PWA Tests](#pwa-tests-child)
   - [Notification Tests](#notification-tests-child)
5. [Test Completion Checklist](#test-completion-checklist)

---

## Introduction

### Purpose

This document provides a comprehensive set of manual test cases for Chore-Ganizer v2.0.0. It is designed to help testers verify that all features work correctly before releasing the application to users.

### Scope

This testing guide covers:

- **Parent functionality**: Full administrative access including user management, chore templates, assignments, recurring chores, pocket money, and statistics
- **Child functionality**: Limited access to view and complete assigned chores, view points and pocket money
- **Cross-cutting features**: Authentication, PWA functionality, notifications

### Testing Approach

1. Follow each test case in order
2. Mark each test as Pass or Fail
3. Document any issues found
4. Report bugs with steps to reproduce

### Test Case Format

| Field | Description |
|-------|-------------|
| **Test ID** | Unique identifier (P-XXX for Parent, C-XXX for Child) |
| **Test Name** | Brief description of what is being tested |
| **Prerequisites** | Conditions that must be met before testing |
| **Steps** | Numbered instructions to execute the test |
| **Expected Result** | What should happen if the feature works correctly |
| **Pass/Fail** | Checkbox to mark test outcome |

---

## Test Environment Setup

### Prerequisites

Before starting manual testing, ensure the following:

#### Application Setup

- [ ] Docker and Docker Compose are installed
- [ ] Application is running via `docker-compose up -d`
- [ ] All containers are healthy (check with `docker-compose ps`)
- [ ] Database is seeded with test data

#### Test Accounts

The following test accounts are available by default:

| Role | Email | Password |
|------|-------|----------|
| Parent | `dad@home` | `password123` |
| Parent | `mom@home` | `password123` |
| Child | `alice@home` | `password123` |
| Child | `bob@home` | `password123` |

#### Browser Requirements

- Modern browser (Chrome, Firefox, Safari, or Edge)
- JavaScript enabled
- Cookies enabled
- For PWA tests: Chrome or Edge recommended

#### Network Requirements

- Stable internet connection
- Access to the application URL
- For notification tests: Valid ntfy topic or SMTP configuration

### Starting the Application

```bash
# Navigate to project directory
cd dev/chore-ganizer

# Start the application
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs if needed
docker-compose logs -f backend
```

### Resetting Test Data

If you need to reset the database to a clean state:

```bash
# Stop the application
docker-compose down

# Remove the database volume
docker volume rm chore-ganizer-data

# Restart the application (will re-seed)
docker-compose up -d
```

---

## Parent Test Cases

### Parent Authentication Tests

#### P-001: Parent Login with Valid Credentials

| Field | Value |
|-------|-------|
| **Test ID** | P-001 |
| **Test Name** | Parent Login with Valid Credentials |
| **Prerequisites** | Application is running, parent account exists |

**Steps:**

1. Open a web browser and navigate to the application URL
2. On the login page, enter email: `dad@home`
3. Enter password: `password123`
4. Click the "Sign In" button

**Expected Result:**
- User is redirected to the dashboard
- Navigation bar shows the user's name
- Sidebar shows all parent-accessible menu items (Dashboard, Chores, Templates, Calendar, Family Members, Statistics, Pocket Money)

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-002: Parent Login with Invalid Password

| Field | Value |
|-------|-------|
| **Test ID** | P-002 |
| **Test Name** | Parent Login with Invalid Password |
| **Prerequisites** | Application is running, parent account exists |

**Steps:**

1. Navigate to the login page
2. Enter email: `dad@home`
3. Enter password: `wrongpassword`
4. Click the "Sign In" button

**Expected Result:**
- Error message is displayed indicating invalid credentials
- User remains on the login page
- Login form is cleared or password field is cleared

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-003: Parent Login with Invalid Email

| Field | Value |
|-------|-------|
| **Test ID** | P-003 |
| **Test Name** | Parent Login with Invalid Email |
| **Prerequisites** | Application is running |

**Steps:**

1. Navigate to the login page
2. Enter email: `nonexistent@home`
3. Enter password: `password123`
4. Click the "Sign In" button

**Expected Result:**
- Error message is displayed indicating invalid credentials
- User remains on the login page

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-004: Parent Logout

| Field | Value |
|-------|-------|
| **Test ID** | P-004 |
| **Test Name** | Parent Logout |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Click the "Logout" button in the navigation bar
2. Wait for the page to load

**Expected Result:**
- User is redirected to the login page
- Session is terminated
- Attempting to access protected routes redirects to login

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-005: Session Persistence

| Field | Value |
|-------|-------|
| **Test ID** | P-005 |
| **Test Name** | Session Persistence Across Browser Refresh |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Log in as a parent
2. Navigate to any page (e.g., Templates)
3. Refresh the browser page (F5 or Ctrl+R)
4. Observe the current page state

**Expected Result:**
- User remains logged in after refresh
- Current page is still displayed
- No redirect to login page occurs

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-006: Session Expiration

| Field | Value |
|-------|-------|
| **Test ID** | P-006 |
| **Test Name** | Session Expiration Handling |
| **Prerequisites** | Parent is logged in, session timeout configured |

**Steps:**

1. Log in as a parent
2. Wait for session to expire (or clear session cookie manually)
3. Attempt to navigate to a protected page
4. Observe the application behavior

**Expected Result:**
- User is redirected to login page
- Appropriate message may be shown indicating session expired
- User can log in again

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-007: Protected Route Access

| Field | Value |
|-------|-------|
| **Test ID** | P-007 |
| **Test Name** | Parent Can Access All Protected Routes |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Log in as a parent
2. Navigate to `/templates` directly via URL
3. Navigate to `/calendar` directly via URL
4. Navigate to `/statistics` directly via URL
5. Navigate to `/users` directly via URL

**Expected Result:**
- All protected routes are accessible to parent users
- No redirects occur
- Each page loads correctly

**Pass/Fail:** [ ] Pass [ ] Fail

---

### User Management Tests

#### P-101: View Family Members List

| Field | Value |
|-------|-------|
| **Test ID** | P-101 |
| **Test Name** | View Family Members List |
| **Prerequisites** | Parent is logged in, multiple users exist |

**Steps:**

1. Click "Family Members" in the sidebar
2. Observe the list of family members

**Expected Result:**
- All family members are displayed
- Each member shows: name, email, role (Parent/Child), point total
- Each member has a unique color indicator

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-102: View Individual Family Member Details

| Field | Value |
|-------|-------|
| **Test ID** | P-102 |
| **Test Name** | View Individual Family Member Details |
| **Prerequisites** | Parent is logged in, child account exists |

**Steps:**

1. Navigate to Family Members page
2. Click on a child's name or "View Details" button
3. Observe the member's profile information

**Expected Result:**
- Member details are displayed
- Shows assigned chores
- Shows completion history
- Shows current point balance

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-103: Create New User via API

| Field | Value |
|-------|-------|
| **Test ID** | P-103 |
| **Test Name** | Create New User via API |
| **Prerequisites** | Parent is logged in, CSRF token obtained |

**Steps:**

1. Open browser developer tools (F12)
2. Go to Console tab
3. Execute the following to create a new user via API:
   ```javascript
   fetch('/api/auth/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'newchild@home',
       password: 'SecurePass123!',
       name: 'New Child',
       role: 'CHILD'
     })
   }).then(r => r.json()).then(console.log)
   ```
4. Navigate to Family Members page

**Expected Result:**
- API returns success response
- New user appears in Family Members list
- User can log in with the new credentials

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-104: Password Strength Validation

| Field | Value |
|-------|-------|
| **Test ID** | P-104 |
| **Test Name** | Password Strength Validation |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Attempt to create a user with a weak password: `password`
2. Attempt to create a user with password: `Password1`
3. Attempt to create a user with password: `Password123!`

**Expected Result:**
- Weak password `password` is rejected (missing uppercase, number, special char)
- Password `Password1` is rejected (missing special character)
- Password `Password123!` is accepted (meets all requirements)

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Chore Template Tests

#### P-201: Create New Chore Template

| Field | Value |
|-------|-------|
| **Test ID** | P-201 |
| **Test Name** | Create New Chore Template |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Click "Templates" in the sidebar
2. Click "Create Template" button
3. Enter title: "Wash Dishes"
4. Enter description: "Wash all dishes in the sink and load dishwasher"
5. Enter points: 10
6. Select a category (if available)
7. Click "Create" button

**Expected Result:**
- Template is created successfully
- Success message is displayed
- New template appears in the templates list
- All entered information is saved correctly

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-202: Edit Existing Chore Template

| Field | Value |
|-------|-------|
| **Test ID** | P-202 |
| **Test Name** | Edit Existing Chore Template |
| **Prerequisites** | Parent is logged in, template exists |

**Steps:**

1. Navigate to Templates page
2. Find an existing template
3. Click "Edit" button
4. Change the title to "Wash All Dishes"
5. Change the points to 15
6. Click "Update" button

**Expected Result:**
- Template is updated successfully
- Success message is displayed
- Changes are reflected in the template list
- Changes persist after page refresh

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-203: Delete Chore Template

| Field | Value |
|-------|-------|
| **Test ID** | P-203 |
| **Test Name** | Delete Chore Template |
| **Prerequisites** | Parent is logged in, template exists with no active assignments |

**Steps:**

1. Navigate to Templates page
2. Find a template with no active assignments
3. Click "Delete" button
4. Confirm the deletion in the dialog

**Expected Result:**
- Template is deleted successfully
- Template no longer appears in the list
- Success message is displayed

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-204: Create Template with All Fields

| Field | Value |
|-------|-------|
| **Test ID** | P-204 |
| **Test Name** | Create Template with All Optional Fields |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Templates page
2. Click "Create Template" button
3. Enter title: "Clean Room"
4. Enter description: "Tidy bedroom, make bed, organize desk"
5. Enter points: 20
6. Select an icon/emoji (if available)
7. Select a color (if available)
8. Select a category
9. Click "Create" button

**Expected Result:**
- Template is created with all fields
- Icon and color are displayed in the template card
- Category is correctly assigned

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-205: Template Validation - Empty Title

| Field | Value |
|-------|-------|
| **Test ID** | P-205 |
| **Test Name** | Template Validation - Empty Title |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Templates page
2. Click "Create Template" button
3. Leave title empty
4. Enter description: "Test description"
5. Enter points: 10
6. Click "Create" button

**Expected Result:**
- Form validation error is displayed
- Title field is highlighted as required
- Template is not created

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-206: Template Validation - Negative Points

| Field | Value |
|-------|-------|
| **Test ID** | P-206 |
| **Test Name** | Template Validation - Negative Points |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Templates page
2. Click "Create Template" button
3. Enter title: "Test Template"
4. Enter points: -5
5. Click "Create" button

**Expected Result:**
- Form validation error is displayed
- Points must be a positive number
- Template is not created

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Chore Assignment Tests

#### P-301: Create Chore Assignment from Template

| Field | Value |
|-------|-------|
| **Test ID** | P-301 |
| **Test Name** | Create Chore Assignment from Template |
| **Prerequisites** | Parent is logged in, template exists, child exists |

**Steps:**

1. Click "Chores" in the sidebar
2. Click "Create Chore" button
3. Select a template from the dropdown
4. Select a child to assign to
5. Set a due date (tomorrow)
6. Click "Create" button

**Expected Result:**
- Chore assignment is created successfully
- Assignment appears in the chores list
- Child receives a notification (if notifications enabled)
- Template details are copied to the assignment

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-302: Create Chore Assignment Without Template

| Field | Value |
|-------|-------|
| **Test ID** | P-302 |
| **Test Name** | Create Chore Assignment Without Template |
| **Prerequisites** | Parent is logged in, child exists |

**Steps:**

1. Navigate to Chores page
2. Click "Create Chore" button
3. Do not select a template
4. Enter title: "Special Task"
5. Enter description: "Help with garage cleanup"
6. Enter points: 25
7. Select a child to assign to
8. Set a due date
9. Click "Create" button

**Expected Result:**
- Chore assignment is created with custom details
- Assignment appears in the chores list
- All custom fields are saved correctly

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-303: Edit Chore Assignment

| Field | Value |
|-------|-------|
| **Test ID** | P-303 |
| **Test Name** | Edit Chore Assignment |
| **Prerequisites** | Parent is logged in, pending chore assignment exists |

**Steps:**

1. Navigate to Chores page
2. Find a pending chore assignment
3. Click "Edit" button
4. Change the due date
5. Change the assigned user
6. Click "Update" button

**Expected Result:**
- Assignment is updated successfully
- Changes are reflected in the chores list
- Success message is displayed

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-304: Delete Chore Assignment

| Field | Value |
|-------|-------|
| **Test ID** | P-304 |
| **Test Name** | Delete Chore Assignment |
| **Prerequisites** | Parent is logged in, pending chore assignment exists |

**Steps:**

1. Navigate to Chores page
2. Find a pending chore assignment
3. Click "Delete" button
4. Confirm the deletion

**Expected Result:**
- Assignment is deleted successfully
- Assignment no longer appears in the list
- Success message is displayed

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-305: Approve Chore Completion

| Field | Value |
|-------|-------|
| **Test ID** | P-305 |
| **Test Name** | Approve Chore Completion |
| **Prerequisites** | Parent is logged in, child has completed a chore |

**Steps:**

1. Have a child mark a chore as complete
2. Navigate to Chores page as parent
3. Find the completed chore
4. Verify the completion status
5. The chore should show as completed with points awarded

**Expected Result:**
- Completed chores are clearly marked
- Points are automatically awarded to the child
- Completion timestamp is recorded

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-306: Mark Chore as Partially Complete

| Field | Value |
|-------|-------|
| **Test ID** | P-306 |
| **Test Name** | Mark Chore as Partially Complete |
| **Prerequisites** | Parent is logged in, pending chore exists |

**Steps:**

1. Navigate to Chores page
2. Find a pending chore
3. Click "Mark Partial" or use the completion menu
4. Enter custom points (less than full value)
5. Add notes explaining partial completion
6. Confirm the action

**Expected Result:**
- Chore status changes to "Partially Complete"
- Custom points are awarded
- Notes are saved and visible
- Child receives partial points

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-307: Filter Chores by Status

| Field | Value |
|-------|-------|
| **Test ID** | P-307 |
| **Test Name** | Filter Chores by Status |
| **Prerequisites** | Parent is logged in, chores with various statuses exist |

**Steps:**

1. Navigate to Chores page
2. Click "All" filter - verify all chores are shown
3. Click "Pending" filter - verify only pending chores are shown
4. Click "Completed" filter - verify only completed chores are shown

**Expected Result:**
- Each filter correctly shows the corresponding chores
- Filter state is visually indicated
- Results update immediately

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-308: Assign Chore to Multiple Children

| Field | Value |
|-------|-------|
| **Test ID** | P-308 |
| **Test Name** | Assign Same Chore to Multiple Children |
| **Prerequisites** | Parent is logged in, multiple children exist |

**Steps:**

1. Navigate to Chores page
2. Create a chore assignment for Child A
3. Create the same chore assignment for Child B
4. Verify both assignments appear in the list

**Expected Result:**
- Both assignments are created successfully
- Each child has their own assignment
- Each can complete independently

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Recurring Chores Tests

#### P-401: Create Daily Recurring Chore

| Field | Value |
|-------|-------|
| **Test ID** | P-401 |
| **Test Name** | Create Daily Recurring Chore |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Recurring Chores page
2. Click "Create Recurring Chore" button
3. Enter title: "Make Bed"
4. Enter description: "Make bed every morning"
5. Enter points: 5
6. Set recurrence: Daily
7. Set interval: 1 (every day)
8. Select assignment mode: Fixed
9. Select a child to assign
10. Click "Create" button

**Expected Result:**
- Recurring chore is created successfully
- Occurrences are generated for the next 30 days
- Each occurrence is assigned to the selected child

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-402: Create Weekly Recurring Chore

| Field | Value |
|-------|-------|
| **Test ID** | P-402 |
| **Test Name** | Create Weekly Recurring Chore |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Recurring Chores page
2. Click "Create Recurring Chore" button
3. Enter title: "Take Out Trash"
4. Enter points: 10
5. Set recurrence: Weekly
6. Select days: Monday, Wednesday, Friday
7. Select assignment mode: Fixed
8. Select a child to assign
9. Click "Create" button

**Expected Result:**
- Recurring chore is created successfully
- Occurrences are generated for Mon/Wed/Fri
- Each occurrence is assigned correctly

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-403: Create Round-Robin Recurring Chore

| Field | Value |
|-------|-------|
| **Test ID** | P-403 |
| **Test Name** | Create Round-Robin Recurring Chore |
| **Prerequisites** | Parent is logged in, multiple children exist |

**Steps:**

1. Navigate to Recurring Chores page
2. Click "Create Recurring Chore" button
3. Enter title: "Set Table"
4. Enter points: 5
5. Set recurrence: Daily
6. Select assignment mode: Round Robin
7. Add multiple children to the rotation pool
8. Click "Create" button

**Expected Result:**
- Recurring chore is created successfully
- Occurrences rotate through the assigned children
- Each child gets equal turns

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-404: Edit Recurring Chore

| Field | Value |
|-------|-------|
| **Test ID** | P-404 |
| **Test Name** | Edit Recurring Chore |
| **Prerequisites** | Parent is logged in, recurring chore exists |

**Steps:**

1. Navigate to Recurring Chores page
2. Find an existing recurring chore
3. Click "Edit" button
4. Change the points value
5. Modify the recurrence pattern
6. Click "Update" button

**Expected Result:**
- Recurring chore is updated successfully
- Future occurrences reflect the changes
- Past occurrences remain unchanged

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-405: Deactivate Recurring Chore

| Field | Value |
|-------|-------|
| **Test ID** | P-405 |
| **Test Name** | Deactivate Recurring Chore |
| **Prerequisites** | Parent is logged in, active recurring chore exists |

**Steps:**

1. Navigate to Recurring Chores page
2. Find an active recurring chore
3. Click "Deactivate" or toggle the active status
4. Confirm the action

**Expected Result:**
- Recurring chore is deactivated
- No new occurrences are generated
- Existing pending occurrences may be cancelled or remain

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-406: View Recurring Chore Occurrences

| Field | Value |
|-------|-------|
| **Test ID** | P-406 |
| **Test Name** | View Recurring Chore Occurrences |
| **Prerequisites** | Parent is logged in, recurring chore with occurrences exists |

**Steps:**

1. Navigate to Recurring Chores page
2. Find a recurring chore
3. Click to expand or view occurrences
4. Observe the list of generated occurrences

**Expected Result:**
- All occurrences within the 30-day window are displayed
- Each occurrence shows due date, assigned user, and status
- Occurrences are ordered by date

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-407: Skip Recurring Chore Occurrence

| Field | Value |
|-------|-------|
| **Test ID** | P-407 |
| **Test Name** | Skip Recurring Chore Occurrence |
| **Prerequisites** | Parent is logged in, pending occurrence exists |

**Steps:**

1. Navigate to Recurring Chores page
2. Find a pending occurrence
3. Click "Skip" button
4. Enter a skip reason (optional)
5. Confirm the action

**Expected Result:**
- Occurrence status changes to "Skipped"
- No points are awarded
- Skip reason is recorded

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Pocket Money Tests

#### P-501: View Pocket Money Dashboard

| Field | Value |
|-------|-------|
| **Test ID** | P-501 |
| **Test Name** | View Pocket Money Dashboard |
| **Prerequisites** | Parent is logged in, pocket money system enabled |

**Steps:**

1. Click "Pocket Money" in the sidebar
2. Observe the dashboard showing all children

**Expected Result:**
- Dashboard displays all children with point balances
- Shows pending points for payout
- Shows projected payout amounts
- Shows currency and conversion rate

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-502: Configure Pocket Money Settings

| Field | Value |
|-------|-------|
| **Test ID** | P-502 |
| **Test Name** | Configure Pocket Money Settings |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Pocket Money page
2. Click "Settings" or "Configure" button
3. Set point value (e.g., 10 cents per point)
4. Select currency (EUR, USD, etc.)
5. Set payout period (Weekly/Monthly)
6. Set payout day
7. Save the configuration

**Expected Result:**
- Settings are saved successfully
- Projected payouts update with new values
- Success message is displayed

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-503: Add Bonus Points

| Field | Value |
|-------|-------|
| **Test ID** | P-503 |
| **Test Name** | Add Bonus Points to Child |
| **Prerequisites** | Parent is logged in, child exists |

**Steps:**

1. Navigate to Pocket Money page
2. Find a child in the list
3. Click "Add Bonus" or similar button
4. Enter bonus points: 10
5. Enter reason: "Good behavior this week"
6. Confirm the action

**Expected Result:**
- Bonus points are added to child's balance
- Transaction appears in point history
- Child's projected payout increases
- Child receives notification (if enabled)

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-504: Deduct Points

| Field | Value |
|-------|-------|
| **Test ID** | P-504 |
| **Test Name** | Deduct Points from Child |
| **Prerequisites** | Parent is logged in, child has points |

**Steps:**

1. Navigate to Pocket Money page
2. Find a child with points
3. Click "Deduct Points" or similar button
4. Enter deduction amount: 5
5. Enter reason: "Broken item replacement"
6. Confirm the action

**Expected Result:**
- Points are deducted from child's balance
- Transaction appears in point history as deduction
- Child's projected payout decreases
- Child receives notification (if enabled)

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-505: Process Payout

| Field | Value |
|-------|-------|
| **Test ID** | P-505 |
| **Test Name** | Process Payout for Child |
| **Prerequisites** | Parent is logged in, child has pending points |

**Steps:**

1. Navigate to Pocket Money page
2. Find a child with pending points
3. Click "Process Payout" or "Pay" button
4. Review the payout details
5. Confirm the payout
6. Mark as paid (if separate step)

**Expected Result:**
- Payout record is created
- Points are converted to currency amount
- Child's point balance is reduced
- Payout appears in history

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-506: View Point Transaction History

| Field | Value |
|-------|-------|
| **Test ID** | P-506 |
| **Test Name** | View Point Transaction History |
| **Prerequisites** | Parent is logged in, transactions exist |

**Steps:**

1. Navigate to Pocket Money page
2. Click on a child's point history or "View History"
3. Observe the list of transactions

**Expected Result:**
- All transactions are listed chronologically
- Each transaction shows: type, points, date, reason
- Running balance is displayed
- Different transaction types are visually distinguished

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-507: Configure Advance Payments

| Field | Value |
|-------|-------|
| **Test ID** | P-507 |
| **Test Name** | Configure Advance Payment Settings |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Pocket Money settings
2. Enable "Allow Negative Balance" or "Advance Payments"
3. Set maximum advance points: 50
4. Save settings
5. Attempt to grant an advance to a child

**Expected Result:**
- Settings are saved
- Advances can be granted up to the limit
- Child balance can go negative
- Advance is tracked in transaction history

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Statistics Dashboard Tests

#### P-601: View Statistics Dashboard

| Field | Value |
|-------|-------|
| **Test ID** | P-601 |
| **Test Name** | View Statistics Dashboard |
| **Prerequisites** | Parent is logged in, chore data exists |

**Steps:**

1. Click "Statistics" in the sidebar
2. Observe the dashboard layout

**Expected Result:**
- Dashboard displays summary cards with key metrics
- Completion rate is shown
- Point trends chart is visible
- Activity feed is displayed

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-602: View Completion Rate Statistics

| Field | Value |
|-------|-------|
| **Test ID** | P-602 |
| **Test Name** | View Completion Rate Statistics |
| **Prerequisites** | Parent is logged in, completed chores exist |

**Steps:**

1. Navigate to Statistics page
2. Find the completion rate section
3. Observe overall completion percentage
4. Observe per-family-member rates

**Expected Result:**
- Overall completion rate is displayed as percentage
- Individual rates for each family member are shown
- Visual chart or graph is present

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-603: Filter Statistics by Date Range

| Field | Value |
|-------|-------|
| **Test ID** | P-603 |
| **Test Name** | Filter Statistics by Date Range |
| **Prerequisites** | Parent is logged in, historical data exists |

**Steps:**

1. Navigate to Statistics page
2. Find the date range filter
3. Select "Last Week" or custom date range
4. Observe the updated statistics

**Expected Result:**
- Statistics update to reflect the selected period
- Charts and metrics refresh
- Date range is clearly indicated

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-604: View Point Trends Chart

| Field | Value |
|-------|-------|
| **Test ID** | P-604 |
| **Test Name** | View Point Trends Chart |
| **Prerequisites** | Parent is logged in, point history exists |

**Steps:**

1. Navigate to Statistics page
2. Find the point trends section
3. Observe the chart showing point accumulation over time

**Expected Result:**
- Line or bar chart shows point trends
- X-axis shows time periods
- Y-axis shows points
- Multiple family members may be shown with different colors

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-605: View Activity Feed

| Field | Value |
|-------|-------|
| **Test ID** | P-605 |
| **Test Name** | View Activity Feed |
| **Prerequisites** | Parent is logged in, recent activity exists |

**Steps:**

1. Navigate to Statistics page
2. Find the activity feed section
3. Observe recent activities

**Expected Result:**
- Recent chore completions are listed
- New assignments are shown
- Point awards are displayed
- Activities are in chronological order

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-606: View Category Breakdown

| Field | Value |
|-------|-------|
| **Test ID** | P-606 |
| **Test Name** | View Category Breakdown |
| **Prerequisites** | Parent is logged in, chores with categories exist |

**Steps:**

1. Navigate to Statistics page
2. Find the category breakdown section
3. Observe statistics by chore category

**Expected Result:**
- Each category shows completion count
- Categories may be shown as pie chart or bar chart
- Most/least completed categories are identifiable

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Notification Tests

#### P-701: View In-App Notifications

| Field | Value |
|-------|-------|
| **Test ID** | P-701 |
| **Test Name** | View In-App Notifications |
| **Prerequisites** | Parent is logged in, notifications exist |

**Steps:**

1. Look for the notification bell icon in the navigation bar
2. Click the bell icon
3. Observe the notification dropdown or page

**Expected Result:**
- Notification list is displayed
- Each notification shows type, message, and timestamp
- Unread notifications are visually distinguished
- Count badge shows unread count

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-702: Mark Notification as Read

| Field | Value |
|-------|-------|
| **Test ID** | P-702 |
| **Test Name** | Mark Notification as Read |
| **Prerequisites** | Parent is logged in, unread notification exists |

**Steps:**

1. Click the notification bell
2. Find an unread notification
3. Click on the notification or "Mark as Read"
4. Observe the notification state

**Expected Result:**
- Notification is marked as read
- Visual indicator changes (no longer bold/highlighted)
- Unread count badge updates

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-703: Configure ntfy Push Notifications

| Field | Value |
|-------|-------|
| **Test ID** | P-703 |
| **Test Name** | Configure ntfy Push Notifications |
| **Prerequisites** | Parent is logged in, ntfy app installed on device |

**Steps:**

1. Navigate to Profile or Settings page
2. Find Notification Settings section
3. Enter ntfy topic name
4. (Optional) Enter custom ntfy server URL
5. Save settings
6. Click "Test Notification" button

**Expected Result:**
- Settings are saved successfully
- Test notification is received on mobile device
- Success message confirms notification sent

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-704: Configure Notification Type Preferences

| Field | Value |
|-------|-------|
| **Test ID** | P-704 |
| **Test Name** | Configure Notification Type Preferences |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Notification Settings
2. Toggle "Chore Assigned" notifications on/off
3. Toggle "Chore Completed" notifications on/off
4. Toggle "Points Earned" notifications on/off
5. Save settings
6. Trigger each event type and verify behavior

**Expected Result:**
- Settings are saved correctly
- Only enabled notification types are received
- Disabled types do not trigger notifications

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-705: Configure Quiet Hours

| Field | Value |
|-------|-------|
| **Test ID** | P-705 |
| **Test Name** | Configure Quiet Hours |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Notification Settings
2. Enable "Quiet Hours"
3. Set start time: 22:00 (10 PM)
4. Set end time: 07:00 (7 AM)
5. Select timezone
6. Save settings
7. Trigger a notification during quiet hours

**Expected Result:**
- Settings are saved
- No push notifications during quiet hours
- In-app notifications still work
- Queued notifications may be delivered after quiet hours

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-706: Email Notification Configuration

| Field | Value |
|-------|-------|
| **Test ID** | P-706 |
| **Test Name** | Email Notification Configuration |
| **Prerequisites** | Parent is logged in, SMTP configured in environment |

**Steps:**

1. Verify SMTP is configured in environment variables
2. Assign a chore to a child
3. Check email inbox for notification

**Expected Result:**
- Email is received for chore assignment
- Email contains chore details
- Email is properly formatted

**Pass/Fail:** [ ] Pass [ ] Fail

---

### PWA Tests (Parent)

#### P-801: Install PWA on Desktop

| Field | Value |
|-------|-------|
| **Test ID** | P-801 |
| **Test Name** | Install PWA on Desktop Browser |
| **Prerequisites** | Application running on HTTPS, parent logged in |

**Steps:**

1. Open Chrome or Edge browser
2. Navigate to the application
3. Look for install icon in address bar (⊕ or download icon)
4. Click the install icon
5. Confirm installation in the prompt
6. Observe the app opening in standalone window

**Expected Result:**
- App is installed successfully
- App opens in its own window (no browser UI)
- App icon appears in desktop/start menu
- App can be launched from desktop shortcut

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-802: Install PWA on Mobile (iOS)

| Field | Value |
|-------|-------|
| **Test ID** | P-802 |
| **Test Name** | Install PWA on iOS Safari |
| **Prerequisites** | iOS device, Safari browser, HTTPS enabled |

**Steps:**

1. Open Safari on iOS device
2. Navigate to the application URL
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Enter name for the app
6. Tap "Add" in top right corner

**Expected Result:**
- App icon appears on home screen
- Tapping icon opens app in full screen
- No Safari browser UI is visible
- App runs in standalone mode

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-803: Install PWA on Mobile (Android)

| Field | Value |
|-------|-------|
| **Test ID** | P-803 |
| **Test Name** | Install PWA on Android Chrome |
| **Prerequisites** | Android device, Chrome browser, HTTPS enabled |

**Steps:**

1. Open Chrome on Android device
2. Navigate to the application URL
3. Tap menu button (three dots)
4. Tap "Add to Home screen" or "Install app"
5. Confirm by tapping "Install"

**Expected Result:**
- App is installed on home screen
- App opens in standalone mode
- App appears in app drawer
- App runs without browser UI

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-804: Use App Offline

| Field | Value |
|-------|-------|
| **Test ID** | P-804 |
| **Test Name** | Use App Offline |
| **Prerequisites** | PWA installed, previously opened while online |

**Steps:**

1. Open the PWA while online to cache data
2. Turn off network connection (airplane mode or disconnect)
3. Refresh the app or navigate between pages
4. Observe offline indicator
5. View cached chores and data

**Expected Result:**
- App loads with cached data
- Offline indicator is displayed
- Navigation works for cached pages
- Previously viewed data is accessible

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-805: Sync After Offline

| Field | Value |
|-------|-------|
| **Test ID** | P-805 |
| **Test Name** | Sync Data After Offline Period |
| **Prerequisites** | PWA installed, changes made offline |

**Steps:**

1. Open the PWA while online
2. Go offline
3. Make a change (e.g., complete a chore)
4. Go back online
5. Observe sync behavior

**Expected Result:**
- Changes made offline are synced
- Success notification appears
- Data is consistent with server
- No data loss occurs

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-806: PWA Update

| Field | Value |
|-------|-------|
| **Test ID** | P-806 |
| **Test Name** | PWA Automatic Update |
| **Prerequisites** | PWA installed, new version deployed |

**Steps:**

1. Open the PWA
2. Wait for update notification or refresh
3. Observe update prompt if available
4. Click "Update" or refresh

**Expected Result:**
- Update notification appears when new version available
- App updates to latest version
- New features/fixes are present
- Cached data is preserved

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Settings Tests

#### P-901: View Profile Settings

| Field | Value |
|-------|-------|
| **Test ID** | P-901 |
| **Test Name** | View Profile Settings |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Click username in the top-right corner of navbar
2. Observe the profile page

**Expected Result:**
- Profile page displays user information
- Shows name, email, role
- Shows total points
- Shows member since date

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-902: Change Password

| Field | Value |
|-------|-------|
| **Test ID** | P-902 |
| **Test Name** | Change Password |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Profile page
2. Find password change section
3. Enter current password
4. Enter new password meeting requirements
5. Confirm new password
6. Submit the form

**Expected Result:**
- Password is changed successfully
- Success message is displayed
- User can log in with new password
- Old password no longer works

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### P-903: Update Notification Preferences

| Field | Value |
|-------|-------|
| **Test ID** | P-903 |
| **Test Name** | Update Notification Preferences |
| **Prerequisites** | Parent is logged in |

**Steps:**

1. Navigate to Profile or Settings page
2. Find notification preferences section
3. Toggle various notification options
4. Save changes

**Expected Result:**
- Preferences are saved
- Success message is displayed
- Future notifications follow new preferences

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Child Test Cases

### Child Authentication Tests

#### C-001: Child Login with Valid Credentials

| Field | Value |
|-------|-------|
| **Test ID** | C-001 |
| **Test Name** | Child Login with Valid Credentials |
| **Prerequisites** | Application is running, child account exists |

**Steps:**

1. Open a web browser and navigate to the application URL
2. On the login page, enter email: `alice@home`
3. Enter password: `password123`
4. Click the "Sign In" button

**Expected Result:**
- User is redirected to the dashboard
- Navigation bar shows the child's name
- Sidebar shows only child-accessible menu items (Dashboard, Chores, Profile)
- No access to Templates, Calendar, Statistics, Family Members

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-002: Child Login with Invalid Credentials

| Field | Value |
|-------|-------|
| **Test ID** | C-002 |
| **Test Name** | Child Login with Invalid Credentials |
| **Prerequisites** | Application is running, child account exists |

**Steps:**

1. Navigate to the login page
2. Enter email: `alice@home`
3. Enter password: `wrongpassword`
4. Click the "Sign In" button

**Expected Result:**
- Error message is displayed
- User remains on the login page
- No access to the application

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-003: Child Logout

| Field | Value |
|-------|-------|
| **Test ID** | C-003 |
| **Test Name** | Child Logout |
| **Prerequisites** | Child is logged in |

**Steps:**

1. Click the "Logout" button in the navigation bar
2. Wait for the page to load

**Expected Result:**
- User is redirected to the login page
- Session is terminated
- Cannot access protected pages without logging in again

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-004: Child Cannot Access Parent Routes

| Field | Value |
|-------|-------|
| **Test ID** | C-004 |
| **Test Name** | Child Cannot Access Parent-Only Routes |
| **Prerequisites** | Child is logged in |

**Steps:**

1. Log in as a child
2. Attempt to navigate to `/templates` directly via URL
3. Attempt to navigate to `/calendar` directly via URL
4. Attempt to navigate to `/statistics` directly via URL
5. Attempt to navigate to `/users` directly via URL

**Expected Result:**
- Child is redirected away from protected routes
- May see "Access Denied" message or redirect to dashboard
- Cannot access parent-only functionality

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Chore Viewing Tests

#### C-101: View Assigned Chores

| Field | Value |
|-------|-------|
| **Test ID** | C-101 |
| **Test Name** | View Assigned Chores |
| **Prerequisites** | Child is logged in, chores assigned to child |

**Steps:**

1. Click "Chores" in the sidebar
2. Observe the list of chores

**Expected Result:**
- Only chores assigned to this child are displayed
- Each chore shows title, description, points, and due date
- Chores not assigned to this child are not visible

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-102: View Chore Details

| Field | Value |
|-------|-------|
| **Test ID** | C-102 |
| **Test Name** | View Chore Details |
| **Prerequisites** | Child is logged in, chore assigned to child |

**Steps:**

1. Navigate to Chores page
2. Click on a chore card to view details

**Expected Result:**
- Chore details are displayed
- Shows full description
- Shows point value
- Shows due date
- Shows status

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-103: Filter Chores by Status

| Field | Value |
|-------|-------|
| **Test ID** | C-103 |
| **Test Name** | Filter Chores by Status |
| **Prerequisites** | Child is logged in, chores with various statuses exist |

**Steps:**

1. Navigate to Chores page
2. Click "Pending" filter
3. Verify only pending chores are shown
4. Click "Completed" filter
5. Verify only completed chores are shown

**Expected Result:**
- Filters work correctly
- Only child's own chores are shown regardless of filter
- Filter state is visually indicated

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-104: View Dashboard Summary

| Field | Value |
|-------|-------|
| **Test ID** | C-104 |
| **Test Name** | View Dashboard Summary |
| **Prerequisites** | Child is logged in |

**Steps:**

1. Navigate to Dashboard
2. Observe the summary information

**Expected Result:**
- Shows "My Pending Chores" count
- Shows "My Completed Chores" count
- Shows "My Points" total
- Shows recent activity for this child only
- Does not show other family members' data

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Chore Completion Tests

#### C-201: Mark Chore as Complete

| Field | Value |
|-------|-------|
| **Test ID** | C-201 |
| **Test Name** | Mark Chore as Complete |
| **Prerequisites** | Child is logged in, pending chore assigned to child |

**Steps:**

1. Navigate to Chores page
2. Find a pending chore assigned to you
3. Click "Complete" button on the chore card
4. Observe the status change

**Expected Result:**
- Chore status changes to "Completed"
- Points are awarded automatically
- Success message is displayed
- Chore moves to completed list

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-202: Cannot Complete Another Child's Chore

| Field | Value |
|-------|-------|
| **Test ID** | C-202 |
| **Test Name** | Cannot Complete Another Child's Chore |
| **Prerequisites** | Child A is logged in, chore assigned to Child B |

**Steps:**

1. Log in as Child A
2. Navigate to Chores page
3. Verify chores assigned to Child B are not visible
4. If visible, attempt to complete Child B's chore

**Expected Result:**
- Child A cannot see Child B's chores
- If somehow visible, completion is blocked
- Error message indicates lack of permission

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-203: Complete Chore from Dashboard

| Field | Value |
|-------|-------|
| **Test ID** | C-203 |
| **Test Name** | Complete Chore from Dashboard |
| **Prerequisites** | Child is logged in, pending chore exists |

**Steps:**

1. Navigate to Dashboard
2. Find a pending chore in the summary
3. Click "Complete" button
4. Observe the result

**Expected Result:**
- Chore is marked complete
- Points are awarded
- Dashboard updates to reflect completion
- Success message appears

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-204: View Completed Chore History

| Field | Value |
|-------|-------|
| **Test ID** | C-204 |
| **Test Name** | View Completed Chore History |
| **Prerequisites** | Child is logged in, completed chores exist |

**Steps:**

1. Navigate to Chores page
2. Click "Completed" filter
3. Observe the list of completed chores

**Expected Result:**
- All completed chores are listed
- Shows completion date
- Shows points earned for each
- Shows total points earned

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Points/Pocket Money Tests

#### C-301: View Current Point Balance

| Field | Value |
|-------|-------|
| **Test ID** | C-301 |
| **Test Name** | View Current Point Balance |
| **Prerequisites** | Child is logged in |

**Steps:**

1. Navigate to Dashboard or Profile
2. Observe the point balance display

**Expected Result:**
- Current point total is prominently displayed
- Balance is accurate based on completed chores
- Balance updates after completing chores

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-302: View Point History

| Field | Value |
|-------|-------|
| **Test ID** | C-302 |
| **Test Name** | View Point History |
| **Prerequisites** | Child is logged in, point transactions exist |

**Steps:**

1. Navigate to Profile or Pocket Money page
2. Find point history section
3. Observe the transaction list

**Expected Result:**
- All point transactions are listed
- Shows type (earned, bonus, deduction)
- Shows points and running balance
- Shows date and source (chore name)

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-303: View Projected Earnings

| Field | Value |
|-------|-------|
| **Test ID** | C-303 |
| **Test Name** | View Projected Earnings |
| **Prerequisites** | Child is logged in, pocket money enabled |

**Steps:**

1. Navigate to Dashboard or Pocket Money section
2. Find projected earnings display

**Expected Result:**
- Shows current points converted to currency
- Shows conversion rate (points × value)
- Shows next payout date
- Shows progress toward payout

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-304: Points Update After Chore Completion

| Field | Value |
|-------|-------|
| **Test ID** | C-304 |
| **Test Name** | Points Update After Chore Completion |
| **Prerequisites** | Child is logged in, pending chore exists |

**Steps:**

1. Note current point balance
2. Complete a chore worth X points
3. Check updated point balance

**Expected Result:**
- Point balance increases by the chore's point value
- Update is immediate
- Transaction appears in history

**Pass/Fail:** [ ] Pass [ ] Fail

---

### PWA Tests (Child)

#### C-401: Install PWA on Child Device

| Field | Value |
|-------|-------|
| **Test ID** | C-401 |
| **Test Name** | Install PWA on Child Device |
| **Prerequisites** | Child has device access, HTTPS enabled |

**Steps:**

1. Open browser on child's device
2. Navigate to application URL
3. Follow platform-specific install steps (see P-801, P-802, P-803)
4. Install the app

**Expected Result:**
- App installs successfully
- Child can log in from the installed app
- App works in standalone mode

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-402: Use App Offline as Child

| Field | Value |
|-------|-------|
| **Test ID** | C-402 |
| **Test Name** | Use App Offline as Child |
| **Prerequisites** | PWA installed, child logged in previously |

**Steps:**

1. Open the PWA while online
2. Go offline (airplane mode)
3. Navigate through the app
4. View assigned chores

**Expected Result:**
- Cached chores are visible
- Navigation works
- Offline indicator shows
- Can view point balance

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-403: Complete Chore Offline

| Field | Value |
|-------|-------|
| **Test ID** | C-403 |
| **Test Name** | Complete Chore While Offline |
| **Prerequisites** | PWA installed, pending chore exists |

**Steps:**

1. Open the PWA while online to cache data
2. Go offline
3. Mark a chore as complete
4. Observe the behavior
5. Go back online
6. Verify sync

**Expected Result:**
- Chore can be marked complete offline
- Change is queued
- Sync occurs when back online
- Points are awarded after sync

**Pass/Fail:** [ ] Pass [ ] Fail

---

### Notification Tests (Child)

#### C-501: Receive New Chore Notification

| Field | Value |
|-------|-------|
| **Test ID** | C-501 |
| **Test Name** | Receive New Chore Notification |
| **Prerequisites** | Child is logged in, notifications enabled |

**Steps:**

1. Have a parent assign a new chore to the child
2. Observe the notification bell or push notification

**Expected Result:**
- In-app notification appears (bell icon shows count)
- Push notification is received (if configured)
- Notification shows chore title and due date

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-502: Receive Points Earned Notification

| Field | Value |
|-------|-------|
| **Test ID** | C-502 |
| **Test Name** | Receive Points Earned Notification |
| **Prerequisites** | Child is logged in, notifications enabled |

**Steps:**

1. Complete a chore
2. Observe the notification

**Expected Result:**
- Notification shows points earned
- May include chore name
- Point balance update is reflected

**Pass/Fail:** [ ] Pass [ ] Fail

---

#### C-503: View Notification History

| Field | Value |
|-------|-------|
| **Test ID** | C-503 |
| **Test Name** | View Notification History |
| **Prerequisites** | Child is logged in, notifications exist |

**Steps:**

1. Click the notification bell icon
2. View the list of notifications
3. Scroll through history

**Expected Result:**
- All notifications are listed
- Shows type, message, and time
- Can mark as read
- Can click to view related chore

**Pass/Fail:** [ ] Pass [ ] Fail

---

## Test Completion Checklist

### Summary

After completing all tests, fill in the summary below:

| Category | Total Tests | Passed | Failed | Skipped |
|----------|-------------|--------|--------|---------|
| Parent Authentication | 7 | | | |
| User Management | 4 | | | |
| Chore Templates | 6 | | | |
| Chore Assignments | 8 | | | |
| Recurring Chores | 7 | | | |
| Pocket Money | 7 | | | |
| Statistics Dashboard | 6 | | | |
| Notifications (Parent) | 6 | | | |
| PWA (Parent) | 6 | | | |
| Settings | 3 | | | |
| Child Authentication | 4 | | | |
| Child Chore Viewing | 4 | | | |
| Child Chore Completion | 4 | | | |
| Child Points/Pocket Money | 4 | | | |
| Child PWA | 3 | | | |
| Child Notifications | 3 | | | |
| **TOTAL** | **78** | | | |

### Issues Found

Document any issues discovered during testing:

| Issue # | Test ID | Description | Severity | Status |
|---------|---------|-------------|----------|--------|
| | | | | |
| | | | | |
| | | | | |

### Severity Levels

- **Critical**: Application crash, data loss, security vulnerability
- **High**: Major feature not working, incorrect results
- **Medium**: Feature partially working, workaround available
- **Low**: Minor issue, cosmetic problem

### Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
| Approver | | | |

---

## Appendix A: Test Data Setup

### Sample Templates

Create these templates for testing:

| Title | Description | Points | Category |
|-------|-------------|--------|----------|
| Wash Dishes | Wash all dishes and load dishwasher | 10 | Kitchen |
| Clean Room | Tidy bedroom, make bed | 15 | Bedroom |
| Take Out Trash | Empty all trash cans | 5 | General |
| Vacuum Living Room | Vacuum entire living room | 20 | Living Room |
| Set Table | Set table for dinner | 5 | Kitchen |

### Sample Assignments

Create these assignments for testing:

| Template | Assigned To | Due Date | Status |
|----------|-------------|----------|--------|
| Wash Dishes | Alice | Tomorrow | Pending |
| Clean Room | Bob | Today | Pending |
| Take Out Trash | Alice | Yesterday | Completed |
| Vacuum Living Room | Bob | Today | Pending |

---

## Appendix B: Browser Compatibility Matrix

Test on the following browsers:

| Browser | Version | Desktop | Mobile | Notes |
|---------|---------|---------|--------|-------|
| Chrome | Latest | [ ] Pass | [ ] Pass | |
| Firefox | Latest | [ ] Pass | [ ] Pass | |
| Safari | Latest | [ ] Pass | [ ] Pass | |
| Edge | Latest | [ ] Pass | N/A | |

---

## Appendix C: Environment Configuration Checklist

Before testing, verify:

- [ ] Application URL is accessible
- [ ] Database is seeded with test data
- [ ] Test user accounts exist
- [ ] SMTP is configured (for email tests)
- [ ] ntfy is configured (for push notification tests)
- [ ] HTTPS is enabled (for PWA tests)
- [ ] Service worker is registered (check DevTools)

---

*Document Version: 1.0*
*Created: 2026-02-23*
*For Chore-Ganizer v2.0.0*
