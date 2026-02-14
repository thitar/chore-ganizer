# Chore-Ganizer Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Personal Dashboard System** (2026-02-14)
  - Complete redesign of Dashboard to show only the current user's own data
  - Each family member now sees their personal chore statistics and calendar
  - Personal stats cards showing: My Pending, Partial, Completed, and My Points
  - Personal calendar showing only the current user's assigned chores
  - Collapsible completed chores section to reduce clutter
  - In-app success notifications instead of browser alerts
  - Auto-refresh after completing chores

- **Partial Completion Feature** (2026-02-14)
  - New `PARTIALLY_COMPLETE` status for chore assignments
  - Children can mark chores as partially complete
  - Half points awarded for partial completion (unless custom points specified)
  - Partially completed chores shown separately on Dashboard with orange styling

- **Custom Points for Parents** (2026-02-14)
  - Parents can award custom points when completing any chore
  - Useful for rewarding extra effort or deducting for poor work
  - Custom points override the default half-points for partial completion

- **Role-Based Access Control** (2026-02-14)
  - Family Calendar is now parents-only (children see personal calendar on Dashboard)
  - Templates menu hidden from children (only parents can manage templates)
  - Route protection: children redirected to Dashboard when accessing restricted pages

### Changed

- **Dashboard Personal Data Loading** (2026-02-14)
  - `loadMyAssignments()` function fetches only current user's assignments via `assignmentsApi.getAll({ userId: user.id })`
  - Calendar data filtered to show only user's own assignments
  - Stats calculated from personal assignments only

- **Sidebar Menu** (2026-02-14)
  - Conditional menu items using `isParent` check
  - Family Calendar and Templates only visible to parents
  - Children see simplified menu: Dashboard, Chores, Profile

- **App Routing** (2026-02-14)
  - Route protection in `renderPage()` function
  - Children accessing `/templates` or `/calendar` redirected to Dashboard

### Fixed

- **Frontend API Response Parsing** (2026-02-14)
  - Fixed all API files using incorrect response data access pattern
  - Issue: APIs were using `response.data.data.X` when they should use `response.data.X`
  - Affected files:
    - `frontend/src/api/assignments.api.ts` - getAll, getById, getUpcoming, getOverdue, getCalendar, create, update, complete
    - `frontend/src/api/templates.api.ts` - getAll, getById, create, update
    - `frontend/src/api/users.api.ts` - getAll, getById, create, update
    - `frontend/src/api/categories.api.ts` - getAll, getById, create, update, getTemplates
    - `frontend/src/api/chores.api.ts` - getAll, getById, create, update, complete
  - Root cause: The API client returns unwrapped response data, so there was an extra `.data` in the access path
  - This fix resolved issues with:
    - Calendar not displaying assignments
    - Dashboard showing empty pending chores list
    - Templates and categories not loading

- **Overdue Status Display** (2026-02-14)
  - Backend now includes `isOverdue` computed field in all assignment responses
  - Dashboard and Calendar now correctly show overdue chores with red styling

- **Overdue Notifications** (2026-02-14)
  - Added automatic overdue notification creation
  - New endpoint: `POST /api/notifications/check-overdue`
  - Frontend calls this when loading notifications
  - Prevents duplicate notifications for same overdue chore

### Added

- **Chore Templates System** (2026-02-13)
  - New `ChoreTemplate` model to store reusable chore definitions
  - New `ChoreAssignment` model to link templates to users with due dates
  - Separate management of chore definitions from chore assignments
  - New API endpoints for chore templates:
    - `GET /api/chore-templates` - Get all templates
    - `GET /api/chore-templates/:id` - Get single template
    - `POST /api/chore-templates` - Create template (parent only)
    - `PUT /api/chore-templates/:id` - Update template (parent only)
    - `DELETE /api/chore-templates/:id` - Delete template (parent only)
  - New API endpoints for chore assignments:
    - `GET /api/chore-assignments` - Get all assignments with filters
    - `GET /api/chore-assignments/upcoming` - Get upcoming assignments
    - `GET /api/chore-assignments/overdue` - Get overdue assignments
    - `GET /api/chore-assignments/calendar` - Get assignments for calendar view
    - `GET /api/chore-assignments/:id` - Get single assignment
    - `POST /api/chore-assignments` - Create assignment
    - `PUT /api/chore-assignments/:id` - Update assignment
    - `POST /api/chore-assignments/:id/complete` - Complete assignment
    - `DELETE /api/chore-assignments/:id` - Delete assignment
  - New services:
    - `chore-templates.service.ts` - Template CRUD operations
    - `chore-assignments.service.ts` - Assignment management with completion tracking
  - Database migration: `20260213_add_templates_assignments`

- **Chore Categories** (2026-02-14)
  - New `ChoreCategory` model for organizing templates
  - Categories: Cleaning, Kitchen, Outdoor, Personal
  - New API endpoints: `/api/chore-categories`

### Changed

- **User Model Updates**
  - Changed `chore` relation to `choreAssignment` for clearer semantics
  - Users now have many chore assignments through the new relationship

- **API Updates**
  - Updated routes to include new template and assignment endpoints
  - Modified users service to use new assignment model

### Fixed

- **Frontend Type Fixes** (2026-02-14)
  - Fixed type mismatch: `ChoreAssignment` now uses `choreTemplateId` and `choreTemplate` to match API response
  - Updated `ChoreCard.tsx` to access template data from `choreTemplate`
  - Updated `ChoreForm.tsx` to use `choreTemplateId`
  - Updated `CalendarView.tsx` to use `choreTemplate`

- **Deprecated API Removal** (2026-02-14)
  - Removed old `/api/chores` endpoint
  - Updated Chores page to use new `/api/chore-assignments` endpoint
  - Updated hooks: `useAssignments` replaces deprecated `useChores`

- **Missing Users Page** (2026-02-14)
  - Created new `Users.tsx` page for Family Members
  - Updated App.tsx routing to use Users page for 'users' route

- **UI Improvements** (2026-02-14)
  - Improved sidebar styling with better buttons
  - Left-aligned all menu items
  - Added hover effects and shadows

- **Documentation** (2026-02-14)
  - Updated API-DOCUMENTATION.md with new chore templates/assignments endpoints
  - Updated USER-GUIDE.md with new workflow
  - Added Calendar View planning to REFACTORING-PLAN.md

- TypeScript error in `chore-assignments.controller.ts` - unused `req` parameter in `getOverdue` function

### Tested

- **API Authentication** (2026-02-14)
  - Verified login: `dad@home` / `password123` - SUCCESS
  - Verified `/api/chore-assignments` returns 3 assignments - SUCCESS
  - Verified `/api/chore-templates` returns 4 templates - SUCCESS
  - Verified `/api/users` returns 4 users - SUCCESS
  - Verified frontend accessible at http://localhost:3002 - SUCCESS

### Known Issues

- None

---

## [1.0.0] - Initial Release

### Features

- **User Management**
  - User registration and authentication
  - Role-based access (Parent/Child)
  - Family group management

- **Chore Management**
  - Create, read, update, delete chores
  - Point-based reward system
  - Chore completion tracking

- **Rewards System**
  - Points accumulation
  - Reward redemption
  - Transaction history

- **Notifications**
  - In-app notifications
  - Notification preferences

- **Family Features**
  - Family group creation
  - Member management
  - Activity tracking

### Technology Stack

- **Backend**: Express.js, TypeScript, Prisma ORM, SQLite
- **Frontend**: React, TypeScript, Vite
- **Authentication**: JWT-based authentication

---

## Migration Notes

### Upgrading to Latest Version

1. Run database migration:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

2. Update frontend to use new API endpoints:
   - Use `/api/chore-templates` for template management
   - Use `/api/chore-assignments` for assignment management

3. Seed the database with sample templates:
   ```bash
   npx prisma db seed
   ```

### API Changes

The following endpoints have been added:
- Template management: `/api/chore-templates`
- Assignment management: `/api/chore-assignments`

The following changes were made to existing endpoints:
- Users now return `choreAssignment` instead of `chore`
