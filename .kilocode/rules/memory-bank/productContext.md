# Product Context

## Project Overview

**Chore-Ganizer** is a modern, family-friendly chore management system designed for homelab deployment. It helps families organize, track, and reward household chores.

**Current Version:** 2.1.9

---

## Core Features

### User Management
- **User Authentication** - Secure session-based login with account lockout protection
- **Role-Based Access** - Different capabilities for parents and children
- **User Color Customization** - Each family member has their own color on the calendar
- **Personal Dashboard** - Each user sees only their own data

### Chore Management
- **Chore Templates** - Reusable chore definitions with categories
- **Chore Assignments** - Assign templates to family members with due dates
- **Chore Categories** - Organize chores by type
- **Points System** - Earn points for completing chores
- **Partial Completion** - Parents can mark chores as partially complete with custom points
- **Calendar View** - Visual calendar of all family assignments

### Recurring Chores
- **Flexible Recurrence** - Daily, weekly, monthly, yearly patterns
- **Custom Intervals** - Every N days/weeks/months (e.g., every 3 days, every 2 weeks)
- **Specific Days** - Every Wednesday, every Monday and Friday
- **Nth Weekday** - 2nd Tuesday of month, last Friday of month
- **Round-Robin Assignment** - Rotate chores among family members
- **Fixed Assignment** - Assign to specific family members

### Pocket Money
- **Points to Currency** - Convert points to monetary value
- **Transaction History** - Track earnings and withdrawals
- **Parent Management** - Parents can add/deduct balance

### Notifications
- **In-App Notifications** - Real-time notification system
- **ntfy.sh Integration** - Push notifications to mobile devices
- **Email Notifications** - SMTP integration for email alerts
- **Configurable Alerts** - Chore assigned, due soon, completed, overdue
- **Quiet Hours** - Suppress notifications during specified hours

---

## Target Users

1. **Parents** - Full access to manage chores, users, and view all family data
2. **Children** - Limited access to view assigned chores, mark complete, view own points

---

## Target Environment

- **Homelab deployment** with Docker Compose
- Single household/family use (not multi-tenant)
- Self-hosted (not cloud SaaS)

---

## Deliberately Excluded Features

- User registration flow (family members are seeded)
- Password reset via email
- Push notifications (native mobile)
- OAuth/Social login
- Multi-tenant/household support
- Advanced analytics
- Mobile native apps

---

## Success Metrics

- Family members can easily view and complete assigned chores
- Parents can efficiently manage chores and track completion
- Points system motivates children to complete chores
- System is reliable and easy to maintain in a homelab environment
