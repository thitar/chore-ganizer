# Changelog

All notable changes to the Chore-Ganizer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.5] - 2026-02-28

### Security
- Fixed H2C smuggling vulnerability in nginx.conf - use $http_upgrade for Upgrade header instead of $connection_upgrade
- Fixed Host header validation issue in nginx.conf - use literal backend:3010 instead of $server_name to prevent host header injection
- Fixed Dockerfile instruction ordering so USER directive comes before HEALTHCHECK (resolves Semgrep missing-user warning)

## [2.0.3] - 2026-02-28

### Security
- Upgraded Semgrep GitHub Action to latest version to resolve false positive findings
- Verified all security controls are properly implemented in Dockerfiles and nginx.conf

## [2.0.2] - 2026-02-26

### Security
- Fixed Semgrep SARIF configuration to properly generate and upload scan results

### Changed
- Updated all version references to 2.0.2 across the project

## [2.0.1] - 2026-02-26

### Security
- Fixed Dockerfile non-root user configuration to prevent privilege escalation
- Removed hardcoded session secret from docker-compose.prod.yml (now requires environment variable)
- Fixed nginx H2C smuggling vulnerability by disabling HTTP/2 cleartext
- Fixed nginx request-host validation to prevent host header injection

### Changed
- Updated all version references to 2.0.1 across the project
- Updated GitHub Actions workflow to use correct semgrep-action input names

## [2.0.0] - 2026-02-22

### Added
- E2E testing with Playwright (78 tests covering auth, chores, recurring chores, pocket money)
- Response compression middleware (50-70% size reduction for API responses)
- Request timing middleware with slow request logging (>1s threshold)
- Frontend lazy loading (40% initial bundle size reduction)
- Background job for automatic daily occurrence generation
- Email notifications via SMTP (chore assigned, completed, points earned)
- PWA support with offline capabilities and installable app
- Statistics dashboard with completion rates, point trends, and activity feed
- Parent-only authorization for statistics routes with `requireParent` middleware

### Changed
- Improved frontend performance with code splitting and lazy loading
- Enhanced notification system with multi-channel support (ntfy.sh + email)
- Better monitoring with request timing and slow query alerts
- Refactored occurrence job `getAssignedUserIds()` to accept `lastOccurrence` as parameter, eliminating duplicate database queries

### Fixed
- N+1 query pattern in statistics service - replaced 4 separate count queries with single groupBy aggregation
- Duplicate database queries in occurrence job - refactored to pass `lastOccurrence` as parameter

### Security
- Fixed XSS vulnerability in email templates - added `escapeHtml()` function to sanitize user-controlled data

### Documentation
- Updated ADMIN-GUIDE.md with email notifications, PWA features, and statistics dashboard sections
- Updated USER-GUIDE.md with PWA installation and offline usage instructions
- Updated TESTING.md with E2E testing section
- Updated QUICK-REFERENCE.md with new features
- Updated version references in all documentation files to 2.0.0
- Created MANUAL-TESTING.md with 78 test cases (60 parent, 18 child)
- Created PRODUCTION-INSTALLATION.md with complete Docker deployment guide

### Technical Details
- Added @playwright/test for E2E testing
- Added compression and @types/compression
- Added node-cron for background jobs
- Added nodemailer for email
- Added vite-plugin-pwa for PWA
- Added recharts for statistics charts
- Database schema updated with email notification fields

## [1.9.0] - 2026-02-22

### Added
- Compound database indexes for improved query performance
  - ChoreAssignment: indexes for calendar views, user dashboard, overdue detection
  - RecurringChore: index for active recurring chores by user
  - PointTransaction: index for transaction history queries
- Caching layer with node-cache for templates and categories
  - 10-minute default TTL with configurable durations
  - Cache statistics endpoint at GET /api/health/cache
  - Automatic cache invalidation on data changes
- Security.txt endpoint at /.well-known/security.txt (RFC 9116 compliant)
- SECURITY.md documentation with vulnerability reporting policy
- Frontend component tests (154 tests across 14 test files)
  - Common components: Button, Input, Modal, Loading, ErrorBoundary, PasswordStrengthIndicator
  - Chores components: ChoreCard, ChoreList, ChoreForm, ChoreFilters
  - Layout components: Navbar, Sidebar
  - Notification components: NotificationBell
  - Pocket Money components: PocketMoneyCard

### Changed
- Improved database query performance with compound indexes
- Enhanced template and category retrieval with caching

### Technical Details
- Added node-cache dependency
- Added @types/node-cache dev dependency
- Database schema updated with new indexes

## [1.8.0] - 2026-02-21

### Fixed
- Version number synchronization across all project files
  - Aligned backend/package.json version with .env APP_VERSION
  - Aligned frontend/package.json version with .env APP_VERSION
  - Updated version.ts fallback value to match current version
  - CHANGELOG now reflects the actual application version (1.8.0)

## [1.0.2] - 2026-02-21

### Fixed
- CI/CD pipeline frontend test failures
  - Changed frontend test script from `vitest` (watch mode) to `vitest run` (single run mode)
  - Vitest was running in watch mode by default, causing CI pipeline to hang indefinitely
  - Tests now complete and exit properly in CI environment

## [1.0.1] - 2026-02-21

### Fixed
- CI/CD pipeline coverage test failures
  - Separated Jest configurations for unit tests and integration tests
  - Created `jest.integration.config.js` for integration tests with proper setup/teardown
  - Modified `jest.config.js` to exclude integration tests from unit test runs
  - Updated npm scripts to use correct configuration for each test type
  - Integration tests now run serially with `--runInBand` to avoid database conflicts

### Added
- Dependabot configuration for automated dependency scanning
  - Weekly checks for npm dependencies (backend and frontend)
  - Monthly checks for GitHub Actions and Docker base images
  - Automatic grouping of minor and patch updates
  - Proper labeling and reviewer assignment for PRs

## [1.4.0] - 2026-02-17

### Added
- **Pocket Money System** - Complete system for managing children's allowances
  - Points-to-currency conversion (configurable rate)
  - Base amount configuration (fixed monthly allowance added to each child's pocket money)
  - Transaction types: EARNED, BONUS, DEDUCTION, PENALTY, PAYOUT, ADVANCE, ADJUSTMENT
  - Payout periods: WEEKLY or MONTHLY
  - Advance payment support
  - Projected earnings calculation
  - Frontend components: PocketMoneyCard, PointHistoryList, PocketMoneyDashboard, ConfigurationForm, BonusDeductionModal, PayoutModal
  - Parent dashboard for managing all children's finances

## [1.3.0] - 2026-02-17

### Changed
- Centralized configuration in single root .env file
  - All configuration now in `dev/chore-ganizer/.env`
  - Configuration changes no longer require Docker rebuild
  - Frontend uses runtime config injection via config.js
  - Added comprehensive .env.example with documentation

### Removed
- Removed nested .env files from backend and frontend directories
- Configuration is now managed centrally

## [1.2.3] - 2026-02-17

### Fixed
- StartDate undefined error when editing recurring chores
  - Added startDate as a dedicated DateTime column in the database
  - Added transformRecurringChore helper to format API responses
  - Properly formats startDate as ISO date string for frontend

## [1.2.2] - 2026-02-17

### Fixed
- Parent edit permission for recurring chores
  - Parents can now edit and delete any recurring chore in the family
  - Removed createdById restriction from update and delete operations
  - Parents are effectively admins with full management access

## [1.2.1] - 2026-02-17

### Fixed
- Round-robin assignment for recurring chores
  - Each occurrence now gets the correct assignee based on its position in the rotation
  - Fixed initial occurrence generation to properly rotate through pool members
  - Fixed update logic to recalculate each pending occurrence individually
  - Fixed completion logic to update all subsequent occurrences with correct rotation

## [1.2.0] - 2026-02-17

### Added
- Calendar integration for recurring chore occurrences
  - Both user calendar and family calendar now display recurring chores
  - Users can complete or skip occurrences directly from the calendar
  - Recurring chores are visually distinguished with a "recurring" label

### Changed
- Child users can now view recurring chores and occurrences
  - Removed createdById filter from list endpoints
  - All family members can view and interact with recurring chores
- All family members can now complete/skip/unskip occurrences

## [1.1.4] - 2026-02-16

### Fixed
- 403 Forbidden error for child users accessing GET /api/users endpoint
  - Removed parent-only authorization restriction from users list endpoint
  - Child users now have read access to family member list for viewing assigned chores

## [1.1.3] - 2026-02-16

### Fixed
- 500 Internal Server Error when creating recurring chores
  - Fixed JSON serialization for Prisma String fields (recurrenceRule, assignedUserIds)
  - Changed from `JSON.parse(JSON.stringify(x))` to `JSON.stringify(x)` for proper string serialization

## [1.1.2] - 2026-02-16

### Fixed
- Node.insertBefore DOM error after login
  - Added dynamic key prop to AppContent component based on auth state
  - Fixed array mutation anti-pattern in Sidebar component

## [1.1.1] - 2026-02-16

### Fixed
- Field name mismatch in RecurrenceRule type between frontend and backend
  - Renamed `byDayOfWeek` to `dayOfWeek`
  - Renamed `byDayOfMonth` to `dayOfMonth`
  - Renamed `byNthWeekday` to `nthWeekday`

## [1.1.0] - 2026-02-16

### Added
- Version numbering system with environment file support
- Chore Definition selection when creating recurring chores
  - Dropdown to select existing template as base
  - Pre-fills title, description, points, and category

### Changed
- Renamed "Templates" to "Chore Definitions" throughout the UI
  - Navigation labels
  - Page titles and headings
  - Form labels and buttons

## [1.0.0] - 2026-02-16

### Added
- Recurring Chores System
  - Backend: 4 new Prisma models (RecurringChore, ChoreOccurrence, RecurringChoreFixedAssignee, RecurringChoreRoundRobinPool)
  - Backend: Recurrence service for generating occurrence dates
  - Backend: 9 new API endpoints for CRUD and occurrence management
  - Frontend: RecurrenceRuleEditor component for configuring recurrence patterns
  - Frontend: AssignmentModeSelector component for fixed/round-robin/mixed assignments
  - Frontend: OccurrenceList and OccurrenceCard components for displaying occurrences
  - Frontend: RecurringChoresPage at /recurring-chores route

### Features
- Recurrence patterns: Daily, weekly, monthly, yearly with intervals
- Day-specific patterns: Specific days of week, nth day of month, nth weekday of month
- Assignment modes: Fixed (same person always), Round-robin (rotates on completion), Mixed
- Occurrence management: Complete, skip, and unskip actions
- 30-day occurrence generation window
- Soft delete for recurring chores

### Security
- All recurring chore write operations require parent role
- Occurrence actions (complete/skip/unskip) available to all authenticated users
