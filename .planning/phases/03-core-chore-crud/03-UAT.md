---
status: complete
phase: 03-core-chore-crud
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md
started: 2026-06-28T19:47:00Z
updated: 2026-06-28T20:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend server. Clear dev.db. Start backend from scratch. Server boots without errors, prisma db push and seed complete successfully.
result: pass

### 2. Parent Creates a Template
expected: As a parent, open Templates page. Click "Create Template". Fill in title, points, category. Save. Template appears in list with correct values.
result: pass

### 3. Parent Edits a Template
expected: In Templates list, click edit icon on a template. Form pre-fills. Change title or points. Save. Updated values appear in list.
result: pass

### 4. Parent Deletes a Template
expected: In Templates list, click delete icon on a template with no completed assignments. Red confirmation panel appears. Click "Delete Template". Template disappears from list.
result: pass

### 5. Parent Creates an Assignment
expected: Click Assignments in NavBar. Click "Assign Chore". Select template, select child, set due date. Save. Assignment appears in table with template name, child name, due date, and Pending status badge.
result: pass

### 6. Parent Edits an Assignment
expected: In Assignments list, click edit icon. Change due date. Save. Updated date appears in table row.
result: pass

### 7. Parent Filters Assignments
expected: In Assignments, use status dropdown to filter by Pending/Completed/All. Use date range to filter. "Reset filters" button resets dates to current month.
result: pass

### 8. Child Views My Chores
expected: As a child (alice@home.local), click "My Chores". Page shows only Alice's assignments with FilterBar and status badges. Default filter is current month.
result: pass

### 9. Child Marks Chore Complete
expected: As a child, on My Chores, click "Mark Complete" on a pending assignment. Button changes to "Completing..." then row updates to Completed (green badge) with points awarded shown.
result: pass

### 10. Parent Deletes an Assignment
expected: In Assignments, click delete icon on a pending assignment. Red confirmation panel appears. Click "Delete Assignment". Assignment disappears from list.
result: pass

### 11. Child Gets 403 on Parent Pages
expected: As a child, navigate directly to /templates. Should see 403 page, not template list. Same for /assignments.
result: pass

### 12. Dashboard Shows Upcoming Chores
expected: As a child, go to Dashboard. "Upcoming Chores" section shows pending assignments sorted by due date with status badges and "Overdue" for past-due items.
result: pass

### 13. Date Filter on My Chores
expected: As a child, on My Chores, change date range. Only assignments within range shown. Click "Reset filters" — all assignments reappear.
result: pass

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
