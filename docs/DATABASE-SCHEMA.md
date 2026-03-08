# Chore-Ganizer Database Schema

**Version:** 2.1.7  
**Database:** SQLite  
**ORM:** Prisma

---

## Overview

Chore-Ganizer uses a SQLite database with the following main entities:
- Users (parents and children)
- Chore Categories
- Chore Templates
- Chore Assignments
- Notifications
- User Notification Settings
- Family
- Pocket Money System
- Recurring Chores System
- Audit Logging

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    User     │       │  ChoreTemplate  │       │   Family    │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id          │◄──────│ choreTemplateId  │       │ id          │
│ email       │       │ createdById      │──────►│ name        │
│ name        │       └──────────────────┘       └─────────────┘
│ role        │                                        │
│ points      │       ┌──────────────────┐             │
│ color       │       │ ChoreAssignment  │             │
└─────────────┘       ├──────────────────┤             │
       │              │ id               │             │
       │              │ choreTemplateId  │◄────────────┘
       │              │ assignedToId     │
       │              │ assignedById     │
       │              │ dueDate          │
       │              │ status           │
       │              └──────────────────┘
       │
       ▼
┌─────────────────────┐
│   RecurringChore    │
├─────────────────────┤
│ id                  │
│ title               │
│ recurrenceRule (JSON)│
│ assignmentMode      │
│ isActive            │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  ChoreOccurrence   │
├─────────────────────┤
│ id                  │
│ recurringChoreId    │
│ dueDate             │
│ status              │
│ assignedUserIds     │
└─────────────────────┘
```

---

## Models

### User

Represents family members (parents and children).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| email | String | - | Unique email address |
| password | String | - | Bcrypt hashed password |
| name | String | - | Display name |
| role | String | "CHILD" | "PARENT" or "CHILD" |
| points | Int | 0 | Current point balance |
| basePocketMoney | Float | 0 | Base pocket money in EUR |
| color | String | "#3B82F6" | Calendar color (hex) |
| createdAt | DateTime | now() | Creation timestamp |
| failedLoginAttempts | Int | 0 | Failed login count |
| lockoutUntil | DateTime? | - | Account lockout expiry |
| lockedAt | DateTime? | - | When account was locked |

**Relations:**
- `createdTemplates` → ChoreTemplate[] (templates created by user)
- `assignedChores` → ChoreAssignment[] (chores assigned to user)
- `assignedByChores` → ChoreAssignment[] (chores assigned by user)
- `notifications` → Notification[]
- `notificationSettings` → UserNotificationSettings?
- `createdRecurringChores` → RecurringChore[]
- `pointTransactions` → PointTransaction[]
- `payouts` → Payout[]

---

### ChoreCategory

Categories for organizing chores.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| name | String | - | Category name (unique) |
| description | String? | - | Optional description |
| icon | String? | - | Icon identifier |
| color | String? | - | Category color |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

---

### ChoreTemplate

Reusable chore definitions that parents create.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| title | String | - | Chore title |
| description | String? | - | Chore instructions |
| points | Int | - | Points awarded for completion |
| icon | String? | - | Icon identifier |
| color | String? | - | Chore color |
| categoryId | Int? | - | FK to ChoreCategory |
| createdById | Int | - | FK to User (creator) |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

**Indexes:**
- `createdById`
- `categoryId`

---

### ChoreAssignment

A specific instance of a chore assigned to a user.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| choreTemplateId | Int | - | FK to ChoreTemplate |
| assignedToId | Int | - | FK to User (assignee) |
| assignedById | Int | - | FK to User (assigner) |
| dueDate | DateTime | - | Due date/time |
| status | String | "PENDING" | "PENDING", "COMPLETED", or "PARTIALLY_COMPLETE" |
| notes | String? | - | Optional notes |
| createdAt | DateTime | now() | Creation timestamp |
| completedAt | DateTime? | - | Completion timestamp |
| penaltyApplied | Boolean | false | Whether overdue penalty applied |
| penaltyPoints | Int? | - | Points deducted as penalty |

**Status Values:**
- `PENDING` - Not yet completed
- `COMPLETED` - Fully completed
- `PARTIALLY_COMPLETE` - Partially completed (custom points)

**Indexes:**
- `assignedToId`
- `dueDate`
- `status`
- `penaltyApplied`
- `assignedToId, dueDate` (calendar views)
- `assignedToId, status` (dashboard)
- `status, dueDate` (overdue detection)

---

### Notification

In-app notifications for users.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| userId | Int | - | FK to User |
| type | String | - | Notification type |
| title | String | - | Notification title |
| message | String | - | Notification message |
| read | Boolean | false | Read status |
| createdAt | DateTime | now() | Creation timestamp |

**Indexes:**
- `userId`

---

### UserNotificationSettings

Per-user notification configuration.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| userId | Int | unique | FK to User |
| ntfyTopic | String? | - | ntfy.sh topic for push |
| ntfyServerUrl | String | "https://ntfy.sh" | ntfy server URL |
| ntfyUsername | String? | - | ntfy auth username |
| ntfyPassword | String? | - | ntfy auth password |
| emailNotifications | Boolean | false | Enable email notifications |
| notificationEmail | String? | - | Override email address |
| notifyChoreAssigned | Boolean | true | Notify on new assignment |
| notifyChoreDueSoon | Boolean | true | Notify when due soon |
| notifyChoreCompleted | Boolean | true | Notify on completion |
| notifyChoreOverdue | Boolean | true | Notify when overdue |
| notifyPointsEarned | Boolean | true | Notify on points earned |
| reminderHoursBefore | Int | 2 | Hours before due for reminder |
| quietHoursStart | Int? | - | Quiet hours start (0-23) |
| quietHoursEnd | Int? | - | Quiet hours end (0-23) |
| overduePenaltyEnabled | Boolean | true | Apply overdue penalties |
| overduePenaltyMultiplier | Int | 2 | Penalty multiplier |
| notifyParentOnOverdue | Boolean | true | Notify parent on overdue |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

---

### Family

Family grouping for multi-child households.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | String | uuid() | Primary key (UUID) |
| name | String | - | Family name |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

**Relations:**
- `pocketMoneyConfig` → PocketMoneyConfig?
- `members` → User[]

---

### PocketMoneyConfig

Configuration for the pocket money system.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| familyId | String | unique | FK to Family |
| pointValue | Int | 10 | Cents per point (10 = €0.10) |
| currency | String | "EUR" | Currency code |
| payoutPeriod | String | "MONTHLY" | "WEEKLY" or "MONTHLY" |
| payoutDay | Int | 15 | Payout day of month/week |
| allowAdvance | Boolean | true | Allow advance payments |
| maxAdvancePoints | Int | 50 | Max points for advance |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

---

### PointTransaction

Transaction history for point changes.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| userId | Int | - | FK to User |
| type | String | - | Transaction type |
| amount | Int | - | Point amount (+/-) |
| description | String? | - | Transaction description |
| choreAssignmentId | Int? | - | Related chore assignment |
| relatedUserId | Int? | - | Related user (for bonuses/deductions) |
| createdAt | DateTime | now() | Creation timestamp |

**Transaction Types:**
- `EARNED` - From completing chores
- `BONUS` - Parent-added bonus
- `DEDUCTION` - Parent-added deduction
- `PENALTY` - Automatic overdue penalty
- `PAYOUT` - Points paid out
- `ADVANCE` - Advance payment
- `ADJUSTMENT` - Manual adjustment

**Indexes:**
- `userId`
- `type`
- `createdAt`
- `userId, createdAt`

---

### Payout

Record of pocket money payouts.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| userId | Int | - | FK to User |
| periodStart | DateTime | - | Payout period start |
| periodEnd | DateTime | - | Payout period end |
| points | Int | - | Points in period |
| amount | Int | - | Amount in cents |
| status | String | "PENDING" | "PENDING", "PAID", "CANCELLED" |
| paidAt | DateTime? | - | When actually paid |
| createdAt | DateTime | now() | Creation timestamp |

**Indexes:**
- `userId`
- `status`

---

### RecurringChore

Definition of a recurring chore pattern.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| title | String | - | Chore title |
| description | String? | - | Chore instructions |
| points | Int | 1 | Points per completion |
| icon | String? | - | Icon identifier |
| color | String? | - | Chore color |
| categoryId | Int? | - | FK to ChoreCategory |
| createdById | Int | - | FK to User (creator) |
| startDate | DateTime | now() | Start date |
| recurrenceRule | String | - | JSON recurrence pattern |
| assignmentMode | String | - | "FIXED", "ROUND_ROBIN", or "MIXED" |
| isActive | Boolean | true | Active status |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

**Recurrence Rule JSON Structure:**
```json
{
  "frequency": "DAILY|WEEKLY|MONTHLY|YEARLY",
  "interval": 1,
  "byDayOfWeek": [0, 1, 2, 3, 4, 5, 6],
  "byDayOfMonth": 15,
  "byNthWeekday": { "weekday": 2, "nth": 1 }
}
```

**Assignment Modes:**
- `FIXED` - Always assigned to same person(s)
- `ROUND_ROBIN` - Rotates through pool
- `MIXED` - Fixed + round-robin combined

**Indexes:**
- `createdById`
- `categoryId`
- `isActive`
- `createdById, isActive`

---

### RecurringChoreFixedAssignee

Junction table for fixed chore assignees.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| recurringChoreId | Int | FK to RecurringChore |
| userId | Int | FK to User |

**Indexes:**
- `recurringChoreId`
- `userId`
- Unique: `recurringChoreId, userId`

---

### RecurringChoreRoundRobinPool

Junction table for round-robin rotation pool.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| recurringChoreId | Int | FK to RecurringChore |
| userId | Int | FK to User |
| order | Int | Rotation order (0-indexed) |

**Indexes:**
- `recurringChoreId`
- `userId`
- Unique: `recurringChoreId, userId`

---

### ChoreOccurrence

Individual occurrence of a recurring chore.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | Int | auto | Primary key |
| recurringChoreId | Int | - | FK to RecurringChore |
| dueDate | DateTime | - | Occurrence due date |
| status | String | "PENDING" | "PENDING", "COMPLETED", or "SKIPPED" |
| assignedUserIds | String | - | JSON array of assigned user IDs |
| roundRobinIndex | Int? | - | Current rotation index |
| completedAt | DateTime? | - | Completion timestamp |
| completedById | Int? | - | FK to User (who marked complete) |
| skippedAt | DateTime? | - | Skip timestamp |
| skippedById | Int? | - | FK to User (who skipped) |
| skipReason | String? | - | Skip reason |
| pointsAwarded | Int? | - | Points at completion |
| notes | String? | - | Occurrence notes |
| createdAt | DateTime | now() | Creation timestamp |
| updatedAt | DateTime | now() | Last update timestamp |

**Indexes:**
- `recurringChoreId`
- `dueDate`
- `status`
- Unique: `recurringChoreId, dueDate`

---

### AuditLog

System audit trail for security and compliance.

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| userId | Int | User who performed action |
| action | String | Action type |
| entityType | String | Affected entity type |
| entityId | Int? | Affected entity ID |
| oldValue | String? | Previous value (JSON) |
| newValue | String? | New value (JSON) |
| ipAddress | String? | Client IP |
| userAgent | String? | Client user agent |
| timestamp | DateTime | Action timestamp |

**Common Action Types:**
- `USER_LOGIN`, `USER_LOGOUT`, `USER_LOCKED`
- `CHORE_CREATED`, `CHORE_COMPLETED`, `CHORE_DELETED`
- `POINTS_EARNED`, `POINTS_DEDUCTED`, `PAYOUT_CREATED`
- `SETTINGS_CHANGED`, `USER_CREATED`, `USER_UPDATED`

**Indexes:**
- `userId`
- `action`
- `entityType, entityId`
- `timestamp`

---

## Database File

- **Filename:** `chore-ganizer.db`
- **Location:** `/app/data/` (in Docker container) or `./data/` (local development)

---

## Migrations

The database uses Prisma migrations for schema changes. Current migrations:

| Migration | Date | Description |
|-----------|------|-------------|
| init | 2026-02-15 | Initial schema |
| add_user_color | 2026-02-15 | Added user color field |

---

## Seeding

The database is seeded with default users:

| Email | Password | Role | Name |
|-------|----------|------|------|
| dad@home | password123 | PARENT | Dad |
| mom@home | password123 | PARENT | Mom |
| alice@home | password123 | CHILD | Alice |
| bob@home | password123 | CHILD | Bob |

---

*Last updated: March 2026*
*For API documentation, see [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)*
*For OpenAPI spec, see [swagger.json](./swagger.json)*
