# Chore-Ganizer Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-02-20

### Added
- **Backend Unit Tests** - Comprehensive test suite for services and middleware
  - Tests for auth.service.ts (login, getUserById)
  - Tests for users.service.ts (getAllUsers, getUserById, getUserAssignments, updateUser)
  - Tests for chore-assignments.service.ts (CRUD operations, completion, filtering)
  - Tests for notification-settings.service.ts (getOrCreate, updateSettings)
  - Tests for auth middleware (authenticate, authorize)
  - Test helpers with mock data fixtures

### Changed
- **CI/CD Pipeline** - Enhanced with test coverage reporting
  - Coverage reports uploaded as artifacts
  - Tests run with coverage on every push

### Documentation
- **Testing Guide** - New comprehensive testing documentation
  - Test structure and organization
  - Writing tests guide
  - Best practices
  - Troubleshooting

---

## [1.6.2] - 2026-02-20

### Changed
- **README Update** - Comprehensive update to reflect current project state
  - Added all new features: Recurring Chores, Pocket Money, ntfy Notifications
  - Added Security & Monitoring features: Audit Logging, Account Lockout, Prometheus Metrics
  - Updated routes table with new pages
  - Updated environment configuration section
  - Added CI/CD Guide reference

---

## [1.6.1] - 2026-02-20

### Fixed
- **Recurring Chores Deletion** - Deleted recurring chores no longer reappear after page refresh
  - Frontend was incorrectly requesting inactive chores in the list view
  - Now properly filters to only show active recurring chores

---

## [1.6.0] - 2026-02-20

### Added
- **Audit Logging** - Track all user actions (login, logout, chore assignments, user changes)
  - New `/api/audit` endpoint for parents to view audit logs
  - Tracks: USER_LOGIN, USER_LOGOUT, USER_LOGIN_FAILED, USER_UPDATED
  - Tracks: CHORE_ASSIGNED, CHORE_COMPLETED, CHORE_UPDATED
  - Tracks: ACCOUNT_LOCKED, ACCOUNT_UNLOCKED_BY_ADMIN
  - Stores IP address and user agent for each action

---

## [1.5.0] - 2026-02-19

### Added
- **Account Lockout** - Auto-lock after 5 failed login attempts, 15 min lockout
- **CI/CD Pipeline** - Combined workflow with GitHub Actions
- **Docker Build Scripts** - Backup scheduling with cron

### Fixed
- Test fixes for auth.test.ts and auth.service.test.ts

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
