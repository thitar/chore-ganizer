# Chore-Ganizer Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-23

### Major Release

This is a major release with significant new features and improvements.

### Added

#### E2E Testing with Playwright
- **Comprehensive E2E Test Suite** - 78 end-to-end tests covering all user flows
  - Authentication tests (login, logout, session handling)
  - Dashboard and navigation tests
  - Chores management tests (CRUD, completion, filtering)
  - Templates management tests
  - Calendar view tests
  - Notifications tests
  - Recurring chores tests
  - Pocket money system tests
  - PWA functionality tests
  - Statistics dashboard tests
- **Playwright Configuration** - Cross-browser testing (Chromium, Firefox, WebKit)
- **Test Fixtures and Helpers** - Reusable test utilities for consistent testing
- **CI/CD Integration** - Automated E2E tests in GitHub Actions

#### Response Compression Middleware
- **Gzip/Brotli Compression** - 50-70% response size reduction
- **Configurable Threshold** - Only compress responses above certain size
- **Content-Type Filtering** - Compress JSON, HTML, CSS, JS responses
- **Performance Improvement** - Faster page loads, especially on slow connections

#### Request Timing Middleware
- **Request Duration Logging** - Track how long each request takes
- **Slow Request Detection** - Automatic logging of requests exceeding threshold
- **Performance Monitoring** - Identify performance bottlenecks
- **Configurable Thresholds** - Customize what counts as "slow"

#### Frontend Lazy Loading
- **Code Splitting** - Routes loaded on-demand
- **40% Initial Bundle Size Reduction** - Faster initial page load
- **Lazy Route Components** - Dashboard, Chores, Templates, Calendar, etc.
- **Loading States** - Smooth transitions while loading routes

#### Background Job for Occurrence Generation
- **Automatic Daily Generation** - Recurring chore occurrences generated automatically
- **Cron Schedule** - Runs daily at midnight (configurable)
- **Missed Run Recovery** - Catches up if server was down
- **Performance Optimized** - Batch processing for efficiency

#### Email Notifications via SMTP
- **Email Notification System** - SMTP-based email delivery
- **Notification Types:**
  - Chore assigned notifications
  - Chore completed notifications (for parents)
  - Points earned notifications
- **Configurable SMTP** - Support for Gmail, Outlook, custom servers
- **Template-based Emails** - HTML email templates
- **Environment Configuration** - Easy setup via environment variables

#### Progressive Web App (PWA) Support
- **Installable App** - Add to home screen on mobile and desktop
- **Service Worker** - Offline capabilities and caching
- **Web App Manifest** - App name, icons, theme colors
- **Offline Mode** - View cached data without internet
- **Background Sync** - Queue changes when offline, sync when online
- **Auto-Update** - Automatic updates when new version available

#### Statistics Dashboard
- **Completion Rates** - Overall and per-family-member statistics
- **Point Trends** - Visual charts showing point accumulation over time
- **Activity Feed** - Recent chore completions and assignments
- **Category Breakdown** - See which chore types are most/least completed
- **Date Range Filtering** - View statistics for specific time periods
- **Parent-Only Access** - Statistics visible to parent role only

### Changed

- **Improved Performance** - Response compression and lazy loading reduce load times
- **Better Test Coverage** - E2E tests complement existing unit/integration tests
- **Enhanced Monitoring** - Request timing helps identify performance issues
- **Updated Documentation** - All docs updated for v2.0.0 features

### Configuration

New environment variables:

```bash
# Email Notifications (SMTP)
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Chore-Ganizer
SMTP_FROM_ADDRESS=noreply@yourdomain.com

# Request Timing
SLOW_REQUEST_THRESHOLD_MS=1000

# Compression
COMPRESSION_ENABLED=true
COMPRESSION_THRESHOLD=1024
```

### Migration Notes

1. **E2E Tests** - Run `npx playwright install` to install browser binaries
2. **Email Setup** - Configure SMTP settings for email notifications
3. **PWA** - Ensure HTTPS for PWA features (required for service worker)
4. **Background Jobs** - Occurrence generation runs automatically; no manual setup needed

---

## [1.8.0] - 2026-02-20

### Added
- **Enhanced Health Check** - Production-ready health monitoring
  - `/api/health` - Full health check with database, memory, and disk metrics
  - `/api/health/live` - Liveness probe (server running check)
  - `/api/health/ready` - Readiness probe (database connectivity check)
  - Memory usage monitoring with warning/critical thresholds
  - Disk usage monitoring for data directory
  - Database latency measurement

- **Backup Verification** - Automated backup integrity verification
  - Backup script now runs integrity check after each backup
  - Restore test runs automatically after backup completion
  - SQLite `PRAGMA integrity_check` validation

- **Error Monitoring with ntfy Webhook** - Real-time error alerts
  - New `error-webhook.ts` utility for sending error notifications
  - Automatic webhook notifications for 500 errors
  - Configurable via environment variables
  - Support for ntfy authentication

### Changed
- **Cron Schedule** - Backup now includes automatic verification
  - Single cron job runs backup and verification together
  - Removed separate weekly restore test (now runs after each backup)

### Configuration
- New environment variables for error webhook:
  - `ERROR_WEBHOOK_ENABLED` - Enable/disable error notifications
  - `ERROR_WEBHOOK_URL` - ntfy webhook URL
  - `ERROR_WEBHOOK_USERNAME` / `ERROR_WEBHOOK_PASSWORD` - Optional auth
  - `ERROR_WEBHOOK_MIN_PRIORITY` - Minimum priority to send (default: 4)

---

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

### Upgrading to v2.0.0

1. **Install Playwright browsers** (for E2E testing):
   ```bash
   cd frontend
   npx playwright install
   ```

2. **Configure Email Notifications** (optional):
   ```bash
   # Add to your .env file
   SMTP_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

3. **Enable HTTPS** (required for PWA):
   - Use a reverse proxy like nginx with SSL
   - Or use Cloudflare for SSL termination

4. **Run database migrations**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

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

The following endpoints have been added in v2.0.0:
- Statistics: `/api/statistics` (parents only)
- Email notification settings: User notification preferences

The following endpoints were added in previous versions:
- Template management: `/api/chore-templates`
- Assignment management: `/api/chore-assignments`

The following changes were made to existing endpoints:
- Users now return `choreAssignment` instead of `chore`
