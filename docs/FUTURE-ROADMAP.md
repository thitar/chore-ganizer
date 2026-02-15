# Chore-Ganizer Future Roadmap

This document outlines planned enhancements and features for future development cycles.

## Priority Levels

- 🔴 **High Priority** - Important for production readiness
- 🟡 **Medium Priority** - Valuable enhancements
- 🟢 **Low Priority** - Nice-to-have features

---

## Phase 6: Production Hardening 🔴

### Security Enhancements

- [x] **Rate Limiting** ✅ COMPLETED
  - Add express-rate-limit to prevent brute force attacks
  - Configure limits per endpoint (stricter for auth endpoints)
  - Implemented in `backend/src/middleware/rateLimiter.ts`

- [x] **Session Store Migration** ✅ COMPLETED
  - Replaced MemoryStore with SQLite store
  - Session persistence configured across restarts
  - Implemented in `backend/src/app.ts`

- [x] **Helmet Security Headers** ✅ COMPLETED
  - Added Helmet middleware for security headers
  - Content Security Policy configured
  - Implemented in `backend/src/app.ts`

- [x] **Request Size Limits** ✅ COMPLETED
  - Added 10kb request body limit
  - Trust proxy configuration enabled
  - Implemented in `backend/src/app.ts`

- [ ] **Password Policy**
  - Minimum length requirement (8+ characters)
  - Complexity requirements (uppercase, lowercase, number, special)
  - Password strength indicator on registration
  - Estimated effort: 3 hours

- [ ] **CSRF Protection**
  - Implement CSRF tokens for form submissions
  - Configure for API endpoints
  - Estimated effort: 2 hours

### Infrastructure

- [x] **Reverse Proxy Setup** ✅ COMPLETED
  - Configured Caddy as reverse proxy
  - Enabled HTTPS with Let's Encrypt
  - Accessible at https://chore.thitar.ovh
  - Proper headers configured (HSTS, X-Frame-Options)

- [x] **Environment Configuration** ✅ COMPLETED
  - Production .env template created
  - Required environment variables documented
  - Environment validation on startup configured

---

## Phase 7: Feature Enhancements 🟡

### Chore Improvements

- [ ] **Recurring Chores Automation**
  - Daily, weekly, monthly recurrence options
  - Automatic chore regeneration after completion
  - Recurrence templates
  - Estimated effort: 8 hours

- [x] **Chore Templates** ✅ COMPLETED
  - Pre-defined chore templates by age group
  - Template management page implemented
  - Implemented in `backend/prisma/schema.prisma` and `frontend/src/pages/Templates.tsx`

- [x] **Chore Categories/Tags** ✅ COMPLETED
  - Organize chores by category (cleaning, outdoor, pet care)
  - Filter and sort by category
  - Category-based point suggestions
  - Implemented in schema and templates

- [ ] **Chore Attachments**
  - Add photos to chore instructions
  - Before/after photo submission
  - Estimated effort: 6 hours

### Rewards System

- [ ] **Rewards Catalog**
  - Create redeemable rewards with point costs
  - Reward categories
  - Custom reward suggestions from children
  - Estimated effort: 8 hours

- [ ] **Point Redemption**
  - Redeem points for rewards
  - Approval workflow for redemptions
  - Point history with redemptions
  - Estimated effort: 6 hours

- [ ] **Achievements/Badges**
  - Milestone achievements (100 chores, 1000 points)
  - Streak bonuses
  - Special badges
  - Estimated effort: 8 hours

### Notifications

- [ ] **Email Notifications**
  - Configure SMTP settings
  - Email templates
  - Daily/weekly digest options
  - Estimated effort: 6 hours

- [ ] **Browser Push Notifications**
  - Web Push API integration
  - Notification preferences per user
  - Estimated effort: 8 hours

- [ ] **Reminder System**
  - Customizable reminder times
  - Escalating reminders for overdue chores
  - Estimated effort: 4 hours

---

## Phase 8: User Experience 🟡

### Dashboard Enhancements

- [x] **Calendar View** ✅ COMPLETED
  - Visual calendar of chores by due date
  - Family calendar with user color coding
  - Implemented in `frontend/src/pages/Calendar.tsx`

- [x] **Dashboard Personal View** ✅ COMPLETED
  - Each user sees only their own data
  - Personal statistics and assignments
  - Implemented in dashboard components

- [ ] **Statistics Dashboard**
  - Completion rate charts
  - Points over time graph
  - Leaderboard
  - Estimated effort: 8 hours

- [ ] **Mobile Responsiveness**
  - Optimize for mobile devices
  - Touch-friendly interface
  - PWA support
  - Estimated effort: 12 hours

### Family Features

- [ ] **Family Groups**
  - Multiple family support
  - Family invitations
  - Switch between families
  - Estimated effort: 10 hours

- [ ] **Avatar/Profile Pictures**
  - Upload profile pictures
  - Avatar selection for children
  - Estimated effort: 4 hours

- [ ] **Themes**
  - Light/dark mode
  - Custom color themes
  - Estimated effort: 6 hours

---

## Phase 9: Technical Improvements 🟢

### Testing

- [ ] **End-to-End Tests**
  - Playwright or Cypress integration
  - Critical user flow tests
  - Estimated effort: 12 hours

- [ ] **Integration Tests**
  - API integration tests
  - Database integration tests
  - Estimated effort: 8 hours

- [ ] **Test Coverage**
  - Increase coverage to 80%+
  - Add missing test cases
  - Estimated effort: 10 hours

### Performance

- [ ] **Database Optimization**
  - Add database indexes
  - Query optimization
  - Connection pooling
  - Estimated effort: 6 hours

- [ ] **Caching**
  - Implement Redis caching
  - Cache frequently accessed data
  - Estimated effort: 6 hours

- [ ] **Bundle Optimization**
  - Code splitting
  - Lazy loading
  - Reduce bundle size
  - Estimated effort: 4 hours

### DevOps

- [ ] **CI/CD Pipeline**
  - GitHub Actions workflow
  - Automated testing
  - Automated deployments
  - Estimated effort: 6 hours

- [ ] **Monitoring**
  - Application monitoring (e.g., PM2, New Relic)
  - Error tracking (e.g., Sentry)
  - Performance monitoring
  - Estimated effort: 4 hours

- [ ] **Database Migrations**
  - PostgreSQL support
  - Migration scripts
  - Database backup automation
  - Estimated effort: 8 hours

---

## Phase 10: Advanced Features 🟢

### Integrations

- [ ] **Calendar Integration**
  - Google Calendar sync
  - Apple Calendar sync
  - Estimated effort: 10 hours

- [ ] **Smart Home Integration**
  - Alexa/Google Home commands
  - "What are my chores?" voice commands
  - Estimated effort: 16 hours

- [ ] **Family Chat**
  - In-app messaging
  - Chore-related discussions
  - Estimated effort: 12 hours

### Analytics

- [ ] **Time Tracking**
  - Track time spent on chores
  - Efficiency metrics
  - Estimated effort: 8 hours

- [ ] **Reports Export**
  - PDF report generation
  - Excel/CSV export
  - Email reports
  - Estimated effort: 6 hours

- [ ] **Predictive Analytics**
  - Chore completion predictions
  - Optimal chore scheduling
  - Estimated effort: 16 hours

---

## Implementation Order Recommendation

### Completed ✅
1. ✅ Rate Limiting
2. ✅ Session Store Migration (SQLite)
3. ✅ Helmet Security Headers
4. ✅ Request Size Limits
5. ✅ Environment Configuration
6. ✅ Chore Templates
7. ✅ Chore Categories
8. ✅ Calendar View
9. ✅ Dashboard Personal View
10. ✅ Reverse Proxy Setup (Caddy + Let's Encrypt)

### Immediate (Next Sprint)
1. Password Policy
2. CSRF Protection

### Short Term (1-2 Months)
1. Recurring Chores Automation
2. Rewards Catalog
3. Email Notifications

### Medium Term (3-6 Months)
1. E2E Tests
2. CI/CD Pipeline
3. Mobile Responsiveness
4. Achievements/Badges

### Long Term (6+ Months)
1. Smart Home Integration
2. Family Groups
3. Analytics Dashboard
4. Calendar Integration

---

## Technical Debt

### Code Quality
- [ ] Add ESLint and Prettier
- [ ] Implement Husky pre-commit hooks
- [ ] Add JSDoc comments to all functions
- [ ] Refactor duplicate code

### Documentation
- [ ] API OpenAPI/Swagger documentation
- [ ] Component documentation (Storybook)
- [ ] Architecture decision records

### Dependencies
- [ ] Regular dependency updates
- [ ] Remove unused dependencies
- [ ] Security audit automation

---

## Notes

- Effort estimates are approximate and may vary
- Priorities may shift based on user feedback
- Consider user feedback when prioritizing features
- Document all changes in CHANGELOG.md

---

*Last updated: February 2026*
