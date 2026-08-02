# Restore Chore History and Calendar Detail Design

## Goal

Restore visibility of overdue and historical chores, and let users inspect every chore scheduled for a selected calendar date.

## Root Cause

The assignments service applies a current-month date range when callers omit both `from` and `to`. The dashboard, My Chores, and Assignments views omit these parameters, so historical and overdue chores are absent before frontend filtering occurs. The Calendar page fetches a bounded month correctly, but its date cells have no interaction for displaying the full day.

## Scope

- An unbounded `GET /api/assignments` request returns all assignments the authenticated user is authorized to see.
- Requests with `from` and/or `to` retain their existing bounded behavior for calendar navigation and other range-based consumers.
- Calendar date cells are accessible buttons that open a dialog for the selected date.
- The dialog lists all chores on that date, including completed chores, with title, assignee, status, and points.
- Empty dates open the dialog with an explicit empty state.

## Data Flow

1. Non-calendar consumers call `GET /api/assignments` without date parameters and receive full chore history, constrained by the existing parent/child role filter.
2. The Calendar page continues calling `GET /api/assignments?from=...&to=...` for its visible month.
3. Clicking a calendar date uses the already loaded date-grouped assignments to render the detail dialog. No additional request is needed.

## Error Handling

- Existing request validation and calendar error state remain unchanged.
- The calendar dialog must close through its close control and Escape key.

## Tests

- Backend service test: an unbounded request has no `dueDate` predicate while preserving role filtering.
- Existing range tests continue verifying `from`/`to` behavior.
- Calendar page tests verify a date cell opens the selected-date dialog and renders both pending and completed chores.
- Assignment page test verifies a past assignment is displayed by default.

## Non-Goals

- No new endpoint or schema migration.
- No changes to assignment editing, completion, or point awarding.
- No pagination or date-range UI redesign.
