# 🚀 Chore-Ganizer Production Readiness Checklist

**Target**: Local homelab deployment for small family (3-5 users)

---

## Phase 1: Core Features Verification

### ✅ Feature 1: Authentication & User Management
- **Status**: Implemented
- **Checkpoint**: Verify before testing
  ```bash
  # Check user routes exist
  grep -r "api/users" backend/src/routes/
  # Should find: users.routes.ts
  ```
- **Tests**:
  - [ ] Parent can log in with correct credentials
  - [ ] Child can log in with correct credentials
  - [ ] Invalid credentials are rejected
  - [ ] Session persists across page refreshes
  - [ ] Logout clears session

### ✅ Feature 2: Pocket Money System
- **Status**: Implemented (verified in recent commits: `e3c4ad8`, `d767f6e`)
- **Checkpoint**: Verify DB schema includes `PocketMoneyConfig` and `PointTransaction`
  ```bash
  docker-compose exec backend npx prisma studio
  # Check: PocketMoneyConfig table exists with payout period settings
  ```
- **Tests**:
  - [ ] Parent can set pocket money payout amount
  - [ ] Parent can set payout day of week
  - [ ] Automatic payout occurs on scheduled day
  - [ ] Child sees current point balance
  - [ ] Child can view point history/transactions

### ✅ Feature 3: Chore Management (Basic)
- **Status**: Implemented
- **Checkpoint**: Verify routes exist
  ```bash
  grep -r "api/chores" backend/src/routes/ | grep -v test
  ```
- **Tests**:
  - [ ] Parent can create a one-time chore
  - [ ] Parent can assign chore to child
  - [ ] Parent can set point value
  - [ ] Parent can set due date/time
  - [ ] Child can view assigned chores
  - [ ] Child can mark chore complete
  - [ ] Points awarded to child when chore completed
  - [ ] Completion date/time is recorded

### ✅ Feature 4: Recurring Chores
- **Status**: Implemented
- **Checkpoint**: Verify `RecurringChore` model exists
  ```bash
  docker-compose exec backend npx prisma studio
  # Check: RecurringChore table with recurrenceRule field
  ```
- **Tests**:
  - [ ] Parent can create recurring chore (daily, weekly, etc.)
  - [ ] Occurrences auto-generate daily
  - [ ] Child sees new occurrence each period
  - [ ] Completing one doesn't affect others
  - [ ] Chores can be skipped without penalty
  - [ ] Assignment modes work: FIXED, ROUND_ROBIN

### ✅ Feature 5: Calendar View
- **Status**: Recently implemented (calendar redesign in progress)
- **Checkpoint**: Verify `CalendarView.tsx` exists and has test coverage
  ```bash
  ls -la frontend/src/components/chores/CalendarView*
  # Should show: CalendarView.tsx and CalendarView.test.tsx
  ```
- **Tests**:
  - [ ] Calendar displays current month
  - [ ] Chores appear on correct dates
  - [ ] Can navigate to previous/next months
  - [ ] Clicking a day shows day detail panel
  - [ ] Day detail panel shows all chores for that day
  - [ ] Can mark chores complete from day panel
  - [ ] Responsive on tablet (at least 1024px width)

### ✅ Feature 6: Overdue Chore Penalties
- **Status**: Implemented
- **Checkpoint**: Verify environment variables set
  ```bash
  docker-compose exec backend printenv | grep OVERDUE
  # Should show: OVERDUE_PENALTY_ENABLED=true (or false)
  ```
- **Tests**:
  - [ ] Overdue penalty applied when chore passes due date
  - [ ] Penalty amount = points × multiplier (default: 2x)
  - [ ] Penalty appears in point history
  - [ ] Parent receives notification when chore overdue
  - [ ] Parent can see which chores are overdue

### ✅ Feature 7: Statistics Dashboard
- **Status**: Implemented (P-601)
- **Checkpoint**: Verify route exists
  ```bash
  grep -r "statistics" backend/src/routes/ | grep -v test
  ```
- **Tests**:
  - [ ] Parent sees dashboard with chore completion stats
  - [ ] Parent sees points earned per child
  - [ ] Parent sees trend over time (weekly/monthly)
  - [ ] Child sees their own stats
  - [ ] Charts/graphs display correctly

---

## Phase 2: Notifications Setup

### ⚠️ Feature 8: ntfy Notifications (Per-User Channels)
- **Status**: Implemented but requires configuration
- **Checkpoint**: Verify ntfy.service.ts exists and tests pass
  ```bash
  npm test --testPathPattern=ntfy backend/
  # All tests should pass
  ```
- **Prerequisites**:
  - [ ] ntfy server running (see NTFY-SETUP.md)
  - [ ] Each user has configured their ntfy topic
  - [ ] Parent topic for parent notifications configured

- **Configuration Tests**:
  - [ ] Child A can set their own notification topic
  - [ ] Child B can set their own different notification topic
  - [ ] Parent can set shared parent topic
  - [ ] Connection to ntfy server tested
  - [ ] Settings persist across sessions

- **Notification Tests**:
  - [ ] Child receives notification when assigned chore
  - [ ] Child receives "due soon" reminder 2 hours before due
  - [ ] Child receives notification when overdue
  - [ ] Parent receives notification when child completes chore
  - [ ] Parent receives notification when child's chore overdue
  - [ ] Notifications include emoji tags (emojis display)
  - [ ] Notifications have correct priority levels
  - [ ] Quiet hours respected (if configured)

---

## Phase 3: Mobile Responsiveness

### ⚠️ Feature 9: Mobile UI (Tablet + Phone)
- **Status**: Recently updated (calendar redesign in progress)
- **Checkpoint**: Check viewport meta tags
  ```bash
  grep -i "viewport" frontend/index.html
  ```
- **Tests on Tablet (1024px+)**:
  - [ ] Login page responsive
  - [ ] Dashboard loads and is readable
  - [ ] Calendar displays in grid (not stacked)
  - [ ] Chore list scrolls properly
  - [ ] Buttons are touch-friendly (48px+ height)
  - [ ] Modal dialogs fit screen
  - [ ] No horizontal scrolling needed

- **Tests on Phone (375px-480px)**:
  - [ ] Login page responsive
  - [ ] Can see and scroll dashboard
  - [ ] Calendar displays (may be collapsed view)
  - [ ] Chore list readable
  - [ ] Can tap buttons without hitting adjacent elements
  - [ ] Text is readable (16px+ font)
  - [ ] Images/icons scale properly

---

## Phase 4: Data Integrity

### ✅ Feature 10: Backups & Recovery
- **Status**: Implemented
- **Checkpoint**: Backup script exists
  ```bash
  ls -la ./backup.sh
  chmod +x ./backup.sh
  ```
- **Setup Tests**:
  - [ ] Manual backup creates compressed DB file
  - [ ] Backup file is readable and not corrupted
  - [ ] Backup can be restored without data loss
  - [ ] Cron job for daily backups configured
  - [ ] Old backups auto-delete (keep 30 days)
  - [ ] Backup size is reasonable (<100MB)

### ✅ Feature 11: Database Integrity
- **Status**: Implemented with Prisma
- **Checkpoint**: Database file verified
  ```bash
  docker-compose exec backend sqlite3 /app/data/chore-ganizer.db "PRAGMA integrity_check;"
  # Should output: ok
  ```
- **Tests**:
  - [ ] Database file exists and is valid
  - [ ] All tables have correct schema
  - [ ] No orphaned foreign keys
  - [ ] Migrations apply cleanly on restart

---

## Phase 5: Security Verification

### ✅ Feature 12: CSRF Protection
- **Status**: Implemented
- **Checkpoint**: Middleware exists
  ```bash
  grep -r "csrf" backend/src/middleware/ | head -3
  ```
- **Tests**:
  - [ ] CSRF token endpoint works (`GET /api/csrf-token`)
  - [ ] Invalid CSRF token is rejected on POST/PUT/DELETE
  - [ ] Valid CSRF token accepted with `X-CSRF-Token` header

### ✅ Feature 13: Rate Limiting
- **Status**: Implemented
- **Checkpoint**: Rate limiter middleware configured
  ```bash
  grep -r "rateLimit" backend/src/app.ts
  ```
- **Tests**:
  - [ ] Excessive login attempts throttled
  - [ ] API endpoints rate limited
  - [ ] Rate limit headers present in responses

### ✅ Feature 14: Session Security
- **Status**: Implemented
- **Checkpoint**: Session config verified
  ```bash
  grep -r "SESSION_SECRET" backend/src/ | grep -v test | head -1
  ```
- **Tests**:
  - [ ] SESSION_SECRET is set (32+ characters)
  - [ ] Secure cookie flags set (for HTTPS)
  - [ ] Session SameSite policy configured
  - [ ] Session timeout is reasonable (7 days default)

---

## Phase 6: Performance & Stability

### ✅ Feature 15: Health Checks & Monitoring
- **Status**: Implemented
- **Checkpoint**: Health endpoints exist
  ```bash
  # Test live health check
  curl http://localhost:3010/api/health/live
  # Should return 200 OK
  ```
- **Tests**:
  - [ ] Backend health endpoint responds within 1s
  - [ ] Frontend health endpoint responds
  - [ ] Health check includes DB connectivity
  - [ ] Health check includes disk space status
  - [ ] Metrics endpoint available (`/api/metrics`)

### ⚠️ Feature 16: Performance Benchmarks
- **Status**: Not formally tested
- **Checkpoint**: Load test a typical workflow
  ```bash
  # After deployment, test these scenarios:
  ```
- **Tests** (Expected: <1s response time):
  - [ ] Login request completes in <500ms
  - [ ] List chores request completes in <500ms
  - [ ] Create chore completes in <500ms
  - [ ] Mark chore complete completes in <500ms
  - [ ] Dashboard load completes in <2s
  - [ ] No memory leaks over 24 hours
  - [ ] DB queries have reasonable indexes

---

## Phase 7: User Acceptance Testing

### Test Users Setup
- [ ] Create test accounts:
  - Parent: `parent1@home.local` / `TestPass123!`
  - Parent: `parent2@home.local` / `TestPass123!`
  - Child: `child1@home.local` / `TestPass123!`
  - Child: `child2@home.local` / `TestPass123!`

### User Stories
- [ ] **Parent**: Create 5 chores for this week
- [ ] **Parent**: Assign to children, set points (10-20 each)
- [ ] **Parent**: Set up recurring chore (Monday-Friday, 8 AM)
- [ ] **Child 1**: View assigned chores on calendar
- [ ] **Child 1**: Complete 3 chores
- [ ] **Parent**: Verify points awarded
- [ ] **Parent**: View statistics (completion rate, points earned)
- [ ] **Child 1**: Receive notifications (assigned, due soon, complete)
- [ ] **Parent**: Receive notifications (child completed chore)
- [ ] **All Users**: Access app from phone/tablet (responsive)

---

## 🎯 Deployment Readiness Sign-Off

### Before Going Live
- [ ] All Phase 1-5 tests passing
- [ ] Phase 6 performance acceptable
- [ ] Phase 7 UAT successful
- [ ] Backups working and tested
- [ ] NTFY notifications configured and tested
- [ ] All family members can login
- [ ] Family tested on 2+ devices
- [ ] No console errors in browser (F12)
- [ ] No error logs in `docker-compose logs`
- [ ] .env file configured with unique SESSION_SECRET
- [ ] Database backed up before deployment

### Production Deployment
```bash
# Final steps
cd ~/chore-ganizer
docker-compose down
docker volume backup chore-ganizer-data
docker-compose pull  # or: docker-compose build
docker-compose up -d
docker-compose logs -f backend
```

### Post-Deployment (Week 1)
- [ ] Monitor daily for errors
- [ ] Verify backups running
- [ ] Gather family feedback
- [ ] Fix any UX issues
- [ ] Ensure all notifications arriving

---

## Test Execution Log

| Date | Phase | Tests | Result | Notes |
|------|-------|-------|--------|-------|
|      |       |       |        |       |
|      |       |       |        |       |

---

**Last Updated**: 2026-03-30
**Version**: 1.0
