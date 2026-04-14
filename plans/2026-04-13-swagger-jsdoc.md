# swagger-jsdoc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-maintained `docs/swagger.json` with one generated from `@swagger` JSDoc annotations in the route files using `swagger-jsdoc`, so documentation is always co-located with code and stays in sync.

**Architecture:** A `swagger.config.ts` holds the base OpenAPI definition (info, servers, tags, all `components/schemas`). Each route file gains `@swagger` JSDoc blocks above every `router.*` call. A `scripts/generate-swagger.ts` script runs `swagger-jsdoc` and writes the output to `docs/swagger.json`. The file stays committed to git for diff-visibility; CI re-generates and fails if the committed version is stale.

**Tech Stack:** `swagger-jsdoc` (generation), `ts-node --transpile-only` (running the script), `@types/swagger-jsdoc` (types), existing Express + TypeScript stack.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/src/swagger.config.ts` | Base OpenAPI definition (info, servers, tags, all schemas) + apis glob |
| Create | `backend/scripts/generate-swagger.ts` | Calls swagger-jsdoc, writes `docs/swagger.json` |
| Modify | `backend/package.json` | Add `swagger-jsdoc` devDep + `docs:generate` / `docs:validate` scripts |
| Modify | `backend/src/routes/index.ts` | `@swagger` JSDoc for health + version routes |
| Modify | `backend/src/routes/auth.routes.ts` | `@swagger` JSDoc for all 6 auth routes |
| Modify | `backend/src/routes/users.routes.ts` | `@swagger` JSDoc for all 9 user routes |
| Modify | `backend/src/routes/chore-templates.routes.ts` | `@swagger` JSDoc for all 5 template routes |
| Modify | `backend/src/routes/chore-assignments.routes.ts` | `@swagger` JSDoc for all 9 assignment routes |
| Modify | `backend/src/routes/chore-categories.routes.ts` | `@swagger` JSDoc for all 6 category routes |
| Modify | `backend/src/routes/recurring-chores.routes.ts` | `@swagger` JSDoc for all 11 recurring routes |
| Modify | `backend/src/routes/notifications.routes.ts` | `@swagger` JSDoc for all 4 notification routes |
| Modify | `backend/src/routes/notification-settings.routes.ts` | `@swagger` JSDoc for all 4 notification-settings routes |
| Modify | `backend/src/routes/overdue-penalty.routes.ts` | `@swagger` JSDoc for all 5 penalty routes |
| Modify | `backend/src/routes/pocket-money.routes.ts` | `@swagger` JSDoc for all 10 pocket-money routes |
| Modify | `backend/src/routes/statistics.routes.ts` | `@swagger` JSDoc for both stats routes |
| Modify | `backend/src/routes/audit.routes.ts` | `@swagger` JSDoc for the audit GET route |
| Modify | `backend/src/routes/metrics.routes.ts` | `@swagger` JSDoc for metrics route |
| Modify | `.github/workflows/ci-cd.yml` | Add `docs:validate` step to backend job |

---

## Task 1: Install Package + Add npm Scripts

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install swagger-jsdoc**

```bash
cd backend && npm install -D swagger-jsdoc @types/swagger-jsdoc
```

- [ ] **Step 2: Add scripts to `backend/package.json`**

In the `"scripts"` block, add after the existing `test:all` entry:

```json
"docs:generate": "ts-node --transpile-only scripts/generate-swagger.ts",
"docs:validate": "ts-node --transpile-only scripts/generate-swagger.ts --validate"
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add package.json package-lock.json
git commit -m "chore: install swagger-jsdoc devDependency"
```

---

## Task 2: Create swagger.config.ts (Base OpenAPI Definition)

**Files:**
- Create: `backend/src/swagger.config.ts`

This file holds everything **except** paths (those come from JSDoc annotations).

- [ ] **Step 1: Create `backend/src/swagger.config.ts`**

```typescript
import type { Options } from 'swagger-jsdoc'
import { VERSION } from './version.js'

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Chore-Ganizer API',
    description: 'Family-friendly chore management system API',
    version: VERSION,
    contact: { name: 'Chore-Ganizer' },
  },
  servers: [
    { url: '/api', description: 'Relative path (via nginx proxy)' },
    { url: 'http://localhost:3010/api', description: 'Local development server' },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Chore Templates', description: 'Chore template management (Parent-only: create, update, delete)' },
    { name: 'Chore Assignments', description: 'Chore assignment management with due dates and completion tracking' },
    { name: 'Chore Categories', description: 'Chore category management (Parent-only: create, update, delete)' },
    { name: 'Notifications', description: 'Notification endpoints' },
    { name: 'Notification Settings', description: 'User notification preferences and ntfy push notification configuration' },
    { name: 'Overdue Penalty', description: 'Overdue chore penalty management (Parent-only: configure settings, process penalties)' },
    { name: 'Recurring Chores', description: 'Recurring chore management with flexible recurrence patterns and occurrence tracking' },
    { name: 'Pocket Money', description: 'Pocket money management endpoints for points-to-currency conversion, payouts, and transactions' },
    { name: 'Statistics', description: 'Family and child statistics endpoints' },
    { name: 'Audit Logs', description: 'Audit log viewing (Parent-only)' },
    { name: 'Metrics', description: 'Prometheus metrics endpoint' },
    { name: 'Security', description: 'Security disclosure and vulnerability reporting endpoints' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session cookie set by POST /api/auth/login',
      },
    },
    schemas: {
      // ── Primitives / enums ───────────────────────────────────────────────
      UserRole: { type: 'string', enum: ['PARENT', 'CHILD'] },
      ChoreStatus: { type: 'string', enum: ['PENDING', 'COMPLETED', 'PARTIALLY_COMPLETE'] },
      RecurrenceFrequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
      AssignmentMode: { type: 'string', enum: ['FIXED', 'ROUND_ROBIN', 'MIXED'] },
      OccurrenceStatus: { type: 'string', enum: ['PENDING', 'COMPLETED', 'SKIPPED'] },
      TransactionType: { type: 'string', enum: ['EARNED', 'BONUS', 'DEDUCTION', 'PENALTY', 'PAYOUT', 'ADVANCE', 'ADJUSTMENT'] },

      // ── Common responses ─────────────────────────────────────────────────
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', nullable: true },
          error: { type: 'string', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Something went wrong' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
      },

      // ── Health schemas ───────────────────────────────────────────────────
      LivenessResponse: {
        type: 'object',
        properties: { status: { type: 'string', example: 'ok' } },
      },
      ReadinessResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          error: { type: 'string', nullable: true },
        },
      },
      DatabaseCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          latency: { type: 'integer', description: 'Latency in ms' },
          error: { type: 'string', nullable: true },
        },
      },
      MemoryCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          used: { type: 'integer' },
          total: { type: 'integer' },
          percentage: { type: 'number' },
        },
      },
      DiskCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          used: { type: 'integer' },
          total: { type: 'integer' },
          percentage: { type: 'number' },
          path: { type: 'string' },
        },
      },
      EnhancedHealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          checks: {
            type: 'object',
            properties: {
              database: { $ref: '#/components/schemas/DatabaseCheck' },
              memory: { $ref: '#/components/schemas/MemoryCheck' },
              disk: { $ref: '#/components/schemas/DiskCheck' },
            },
          },
        },
      },

      // ── Auth ─────────────────────────────────────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { $ref: '#/components/schemas/UserRole' },
              points: { type: 'integer' },
              color: { type: 'string', nullable: true },
            },
          },
        },
      },

      // ── User ─────────────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
          points: { type: 'integer' },
          color: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      UpdateMyProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          color: { type: 'string', description: 'Hex color code e.g. #3B82F6' },
        },
      },

      // ── Chore Templates ───────────────────────────────────────────────────
      ChoreTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          points: { type: 'integer' },
          icon: { type: 'string', nullable: true },
          color: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateChoreTemplateRequest: {
        type: 'object',
        required: ['title', 'points'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          points: { type: 'integer', minimum: 0 },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
      },
      UpdateChoreTemplateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          points: { type: 'integer', minimum: 0 },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
      },

      // ── Chore Assignments ─────────────────────────────────────────────────
      ChoreAssignment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          templateId: { type: 'string' },
          template: { $ref: '#/components/schemas/ChoreTemplate' },
          assignedToId: { type: 'string' },
          assignedTo: { $ref: '#/components/schemas/User' },
          dueDate: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/ChoreStatus' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CreateChoreAssignmentRequest: {
        type: 'object',
        required: ['templateId', 'assignedToId', 'dueDate'],
        properties: {
          templateId: { type: 'string' },
          assignedToId: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
      UpdateChoreAssignmentRequest: {
        type: 'object',
        properties: {
          assignedToId: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/ChoreStatus' },
        },
      },

      // ── Chore Categories ──────────────────────────────────────────────────
      ChoreCategory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          icon: { type: 'string', nullable: true },
          color: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          _count: {
            type: 'object',
            properties: { templates: { type: 'integer' } },
          },
        },
      },
      CreateChoreCategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
      },
      UpdateChoreCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
      },

      // ── Notifications ─────────────────────────────────────────────────────
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationSettings: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          ntfyTopic: { type: 'string', nullable: true },
          ntfyServerUrl: { type: 'string', nullable: true },
          ntfyUsername: { type: 'string', nullable: true },
          ntfyPassword: { type: 'string', nullable: true },
          notifyChoreAssigned: { type: 'boolean' },
          notifyChoreDueSoon: { type: 'boolean' },
          notifyChoreCompleted: { type: 'boolean' },
          notifyChoreOverdue: { type: 'boolean' },
        },
      },
      UpdateNotificationSettingsRequest: {
        type: 'object',
        properties: {
          ntfyTopic: { type: 'string' },
          ntfyServerUrl: { type: 'string' },
          ntfyUsername: { type: 'string' },
          ntfyPassword: { type: 'string' },
          notifyChoreAssigned: { type: 'boolean' },
          notifyChoreDueSoon: { type: 'boolean' },
          notifyChoreCompleted: { type: 'boolean' },
          notifyChoreOverdue: { type: 'boolean' },
          emailNotificationsEnabled: { type: 'boolean' },
          smtpHost: { type: 'string' },
          smtpPort: { type: 'integer' },
          smtpUser: { type: 'string' },
          smtpPassword: { type: 'string' },
          emailAddress: { type: 'string', format: 'email' },
          weeklyReportEnabled: { type: 'boolean' },
          overdueAlertsEnabled: { type: 'boolean' },
        },
      },

      // ── Overdue Penalty ───────────────────────────────────────────────────
      OverdueChore: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/ChoreStatus' },
          daysOverdue: { type: 'integer' },
          choreTemplate: { $ref: '#/components/schemas/ChoreTemplate' },
          assignedTo: { $ref: '#/components/schemas/User' },
        },
      },
      PenaltyRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          penaltyApplied: { type: 'boolean' },
          penaltyPoints: { type: 'integer' },
          choreTemplate: { $ref: '#/components/schemas/ChoreTemplate' },
          assignedTo: { $ref: '#/components/schemas/User' },
        },
      },
      UpdatePenaltySettingsRequest: {
        type: 'object',
        properties: {
          overduePenaltyEnabled: { type: 'boolean' },
          overduePenaltyMultiplier: { type: 'number' },
          notifyParentOnOverdue: { type: 'boolean' },
        },
      },

      // ── Recurring Chores ──────────────────────────────────────────────────
      RecurrenceRule: {
        type: 'object',
        required: ['frequency', 'interval', 'startDate'],
        properties: {
          frequency: { $ref: '#/components/schemas/RecurrenceFrequency' },
          interval: { type: 'integer', minimum: 1 },
          startDate: { type: 'string', format: 'date' },
          byDayOfWeek: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
          byDayOfMonth: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 31 } },
          byNthWeekday: {
            type: 'object',
            properties: {
              n: { type: 'integer' },
              weekday: { type: 'integer', minimum: 0, maximum: 6 },
            },
          },
        },
      },
      RecurringChore: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          points: { type: 'integer' },
          icon: { type: 'string', nullable: true },
          color: { type: 'string', nullable: true },
          categoryId: { type: 'string', nullable: true },
          category: { $ref: '#/components/schemas/ChoreCategory' },
          assignmentMode: { $ref: '#/components/schemas/AssignmentMode' },
          isActive: { type: 'boolean' },
          recurrenceRule: { $ref: '#/components/schemas/RecurrenceRule' },
        },
      },
      ChoreOccurrence: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          recurringChoreId: { type: 'string' },
          recurringChore: { $ref: '#/components/schemas/RecurringChore' },
          dueDate: { type: 'string', format: 'date-time' },
          status: { $ref: '#/components/schemas/OccurrenceStatus' },
          assignedUserIds: { type: 'array', items: { type: 'string' } },
          assignedUsers: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          completedById: { type: 'string', nullable: true },
        },
      },
      CreateRecurringChoreRequest: {
        type: 'object',
        required: ['title', 'recurrenceRule', 'assignmentMode'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          points: { type: 'integer', minimum: 0 },
          icon: { type: 'string' },
          color: { type: 'string' },
          categoryId: { type: 'string' },
          assignmentMode: { $ref: '#/components/schemas/AssignmentMode' },
          fixedAssigneeIds: { type: 'array', items: { type: 'string' } },
          roundRobinPoolIds: { type: 'array', items: { type: 'string' } },
          recurrenceRule: { $ref: '#/components/schemas/RecurrenceRule' },
        },
      },
      UpdateRecurringChoreRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          points: { type: 'integer', minimum: 0 },
          categoryId: { type: 'string' },
          assignmentMode: { $ref: '#/components/schemas/AssignmentMode' },
          fixedAssigneeIds: { type: 'array', items: { type: 'string' } },
          roundRobinPoolIds: { type: 'array', items: { type: 'string' } },
          recurrenceRule: { $ref: '#/components/schemas/RecurrenceRule' },
        },
      },
      CompleteOccurrenceRequest: {
        type: 'object',
        required: ['completedById'],
        properties: { completedById: { type: 'string' } },
      },
      SkipOccurrenceRequest: {
        type: 'object',
        required: ['skippedById'],
        properties: { skippedById: { type: 'string' } },
      },
      ToggleActiveRequest: {
        type: 'object',
        required: ['isActive'],
        properties: { isActive: { type: 'boolean' } },
      },

      // ── Pocket Money ──────────────────────────────────────────────────────
      PointTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          type: { $ref: '#/components/schemas/TransactionType' },
          points: { type: 'integer' },
          reason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AddBonusRequest: {
        type: 'object',
        required: ['userId', 'points'],
        properties: {
          userId: { type: 'string' },
          points: { type: 'integer', minimum: 1 },
          reason: { type: 'string' },
        },
      },
      AddDeductionRequest: {
        type: 'object',
        required: ['userId', 'points'],
        properties: {
          userId: { type: 'string' },
          points: { type: 'integer', minimum: 1 },
          reason: { type: 'string' },
        },
      },
      AddAdvanceRequest: {
        type: 'object',
        required: ['userId', 'points'],
        properties: {
          userId: { type: 'string' },
          points: { type: 'integer', minimum: 1 },
          reason: { type: 'string' },
        },
      },
      CreatePayoutRequest: {
        type: 'object',
        required: ['userId', 'points'],
        properties: {
          userId: { type: 'string' },
          points: { type: 'integer', minimum: 1 },
          note: { type: 'string' },
        },
      },
      TransactionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              transaction: { $ref: '#/components/schemas/PointTransaction' },
              newBalance: { type: 'integer' },
            },
          },
        },
      },
      PocketMoneyConfig: {
        type: 'object',
        properties: {
          pointValueInCents: { type: 'integer', description: 'Value of 1 point in cents' },
          currency: { type: 'string', example: 'USD' },
        },
      },

      // ── Statistics ────────────────────────────────────────────────────────
      FamilyStatistics: {
        type: 'object',
        properties: {
          totalChores: { type: 'integer' },
          completedChores: { type: 'integer' },
          overdueChores: { type: 'integer' },
          completionRate: { type: 'number' },
          topPerformer: { $ref: '#/components/schemas/User' },
          childStats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                totalChores: { type: 'integer' },
                completedChores: { type: 'integer' },
                points: { type: 'integer' },
              },
            },
          },
        },
      },
      ChildStatistics: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          totalChores: { type: 'integer' },
          completedChores: { type: 'integer' },
          overdueChores: { type: 'integer' },
          points: { type: 'integer' },
          completionRate: { type: 'number' },
          recentActivity: { type: 'array', items: { $ref: '#/components/schemas/ChoreAssignment' } },
        },
      },

      // ── Audit ─────────────────────────────────────────────────────────────
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          action: { type: 'string' },
          entityType: { type: 'string' },
          entityId: { type: 'string', nullable: true },
          oldValue: { type: 'object', nullable: true },
          newValue: { type: 'object', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}

export const swaggerOptions: Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/index.ts',
    './src/routes/auth.routes.ts',
    './src/routes/users.routes.ts',
    './src/routes/chore-templates.routes.ts',
    './src/routes/chore-assignments.routes.ts',
    './src/routes/chore-categories.routes.ts',
    './src/routes/notifications.routes.ts',
    './src/routes/notification-settings.routes.ts',
    './src/routes/overdue-penalty.routes.ts',
    './src/routes/recurring-chores.routes.ts',
    './src/routes/pocket-money.routes.ts',
    './src/routes/statistics.routes.ts',
    './src/routes/audit.routes.ts',
    './src/routes/metrics.routes.ts',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add src/swagger.config.ts
git commit -m "feat: add swagger-jsdoc base configuration with all schemas"
```

---

## Task 3: Create the Generate Script

**Files:**
- Create: `backend/scripts/generate-swagger.ts`

- [ ] **Step 1: Create `backend/scripts/generate-swagger.ts`**

```typescript
import swaggerJSDoc from 'swagger-jsdoc'
import fs from 'fs'
import path from 'path'
import { swaggerOptions } from '../src/swagger.config.js'

const outputPath = path.resolve(__dirname, '../../docs/swagger.json')

const spec = swaggerJSDoc(swaggerOptions)
const json = JSON.stringify(spec, null, 2) + '\n'

const isValidate = process.argv.includes('--validate')

if (isValidate) {
  const existing = fs.readFileSync(outputPath, 'utf-8').trim()
  const generated = json.trim()
  if (existing !== generated) {
    console.error('❌ docs/swagger.json is out of date. Run: npm run docs:generate')
    process.exit(1)
  }
  console.log('✓ docs/swagger.json is up to date')
} else {
  fs.writeFileSync(outputPath, json)
  console.log(`✓ Generated docs/swagger.json (${Object.keys(spec.paths ?? {}).length} paths)`)
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add scripts/generate-swagger.ts
git commit -m "feat: add generate-swagger script for docs generation"
```

---

## Task 4: Add @swagger JSDoc to index.ts (Health + Version routes)

**Files:**
- Modify: `backend/src/routes/index.ts`

Add `@swagger` JSDoc blocks above each `router.get(...)` call, immediately before the call. The `@route`/`@desc` comments that are already there can be replaced.

- [ ] **Step 1: Add JSDoc annotations to `backend/src/routes/index.ts`**

Replace the existing inline comments with `@swagger` JSDoc blocks:

```typescript
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Full health check
 *     description: Returns DB, memory, and disk health. Returns 503 if degraded or error.
 *     operationId: healthCheck
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedHealthResponse'
 *       503:
 *         description: API is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnhancedHealthResponse'
 */
router.get('/health', asyncHandler(healthController.healthCheck))

/**
 * @swagger
 * /health/live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Kubernetes-style liveness probe — checks if the server is running.
 *     operationId: livenessCheck
 *     responses:
 *       200:
 *         description: Server is alive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LivenessResponse'
 */
router.get('/health/live', healthController.livenessCheck)

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Returns 503 if the database is not reachable.
 *     operationId: readinessCheck
 *     responses:
 *       200:
 *         description: API is ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 *       503:
 *         description: Not ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 */
router.get('/health/ready', asyncHandler(healthController.readinessCheck))

/**
 * @swagger
 * /health/cache:
 *   get:
 *     tags: [Health]
 *     summary: Cache statistics
 *     description: Returns template and category cache stats (keys, hits, misses, sizes).
 *     operationId: getCacheStats
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     keys:
 *                       type: integer
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                     ksize:
 *                       type: integer
 *                     vsize:
 *                       type: integer
 */
router.get('/health/cache', healthController.getCacheStatsHandler)

/**
 * @swagger
 * /.well-known/security.txt:
 *   get:
 *     tags: [Security]
 *     summary: Security contact information (RFC 9116)
 *     operationId: getSecurityTxt
 *     responses:
 *       200:
 *         description: Security disclosure info
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/.well-known/security.txt', healthController.getSecurityTxt)

/**
 * @swagger
 * /version:
 *   get:
 *     tags: [Health]
 *     summary: Get API version
 *     operationId: getVersion
 *     responses:
 *       200:
 *         description: Version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: string
 *                   example: "2.1.9"
 *                 buildDate:
 *                   type: string
 *                   example: "2026-04-13"
 *                 fullVersion:
 *                   type: string
 *                   example: "2.1.9+20260413"
 */
router.get('/version', (_req: Request, res: Response) => { ... })
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/index.ts
git commit -m "docs: add swagger JSDoc to health/version routes"
```

---

## Task 5: Add @swagger JSDoc to auth.routes.ts

**Files:**
- Modify: `backend/src/routes/auth.routes.ts`

- [ ] **Step 1: Add JSDoc to auth routes**

Add the following blocks immediately above each `router.*` call (replace existing `@route/@desc` comments):

```typescript
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     operationId: register
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', ...)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticate a user and create a session.
 *     operationId: login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie
 *             schema:
 *               type: string
 *               example: "connect.sid=s%3A...; Path=/; HttpOnly"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', ...)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     security:
 *       - cookieAuth: []
 *     operationId: logout
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', ...)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - cookieAuth: []
 *     operationId: getCurrentUser
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', ...)

/**
 * @swagger
 * /auth/unlock/{userId}:
 *   post:
 *     tags: [Auth]
 *     summary: Unlock a locked account (legacy)
 *     description: Unlock a user account that was locked due to failed login attempts. Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: unlockByAuthRoute
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account unlocked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/unlock/:userId', ...)

/**
 * @swagger
 * /auth/lockout-status/{userId}:
 *   get:
 *     tags: [Auth]
 *     summary: Get lockout status for a user
 *     security:
 *       - cookieAuth: []
 *     operationId: getLockoutStatus
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lockout status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLocked:
 *                       type: boolean
 *                     failedAttempts:
 *                       type: integer
 *                     lockedUntil:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/lockout-status/:userId', ...)
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/auth.routes.ts
git commit -m "docs: add swagger JSDoc to auth routes"
```

---

## Task 6: Add @swagger JSDoc to users.routes.ts

**Files:**
- Modify: `backend/src/routes/users.routes.ts`

The 9 users routes (GET /, POST /, GET /:id, GET /:id/assignments, PATCH /me, PUT /:id, DELETE /:id, POST /:id/lock, POST /:id/unlock).

- [ ] **Step 1: Add JSDoc — all users routes**

```typescript
/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     security:
 *       - cookieAuth: []
 *     operationId: getAllUsers
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: createUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile (name / color)
 *     security:
 *       - cookieAuth: []
 *     operationId: updateMyProfile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMyProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: getUserById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: updateUser
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: deleteUser
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}/assignments:
 *   get:
 *     tags: [Users]
 *     summary: Get assignments for a user
 *     security:
 *       - cookieAuth: []
 *     operationId: getUserAssignments
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChoreAssignment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}/lock:
 *   post:
 *     tags: [Users]
 *     summary: Lock a user account
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: lockUserAccount
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users/{id}/unlock:
 *   post:
 *     tags: [Users]
 *     summary: Unlock a user account
 *     description: Parent-only.
 *     security:
 *       - cookieAuth: []
 *     operationId: unlockUserAccount
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account unlocked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Forbidden — Parent-only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/users.routes.ts
git commit -m "docs: add swagger JSDoc to user routes"
```

---

## Task 7: Add @swagger JSDoc to Remaining Route Files

Add JSDoc blocks to the remaining 10 route files. Format follows the same pattern as Tasks 4–6. The exact YAML to write is derived from the current `docs/swagger.json` for each path. Each file gets one commit.

### 7a — chore-templates.routes.ts (5 routes: GET /, POST /, GET /:id, PUT /:id, DELETE /:id)

```
GET    /chore-templates                → operationId: getChoreTemplates
POST   /chore-templates                → operationId: createChoreTemplate
GET    /chore-templates/{id}           → operationId: getChoreTemplate
PUT    /chore-templates/{id}           → operationId: updateChoreTemplate
DELETE /chore-templates/{id}           → operationId: deleteChoreTemplate
```
Schemas: `CreateChoreTemplateRequest`, `UpdateChoreTemplateRequest`, `ChoreTemplate`
Commit: `"docs: add swagger JSDoc to chore-template routes"`

### 7b — chore-assignments.routes.ts (9 routes)

```
GET    /chore-assignments              → operationId: getChoreAssignments
POST   /chore-assignments              → operationId: createChoreAssignment
GET    /chore-assignments/upcoming     → operationId: getUpcomingAssignments
GET    /chore-assignments/overdue      → operationId: getOverdueAssignments
GET    /chore-assignments/calendar     → operationId: getCalendarAssignments
GET    /chore-assignments/{id}         → operationId: getChoreAssignment
PUT    /chore-assignments/{id}         → operationId: updateChoreAssignment
POST   /chore-assignments/{id}/complete → operationId: completeChoreAssignment
DELETE /chore-assignments/{id}         → operationId: deleteChoreAssignment
```
Schemas: `CreateChoreAssignmentRequest`, `UpdateChoreAssignmentRequest`, `ChoreAssignment`
Commit: `"docs: add swagger JSDoc to chore-assignment routes"`

### 7c — chore-categories.routes.ts (6 routes)

```
GET    /chore-categories               → operationId: getChoreCategories
POST   /chore-categories               → operationId: createChoreCategory
GET    /chore-categories/{id}          → operationId: getChoreCategory
PUT    /chore-categories/{id}          → operationId: updateChoreCategory
DELETE /chore-categories/{id}          → operationId: deleteChoreCategory
GET    /chore-categories/{id}/templates → operationId: getCategoryTemplates
```
Schemas: `CreateChoreCategoryRequest`, `UpdateChoreCategoryRequest`, `ChoreCategory`, `ChoreTemplate`
Commit: `"docs: add swagger JSDoc to chore-category routes"`

### 7d — notifications.routes.ts (4 routes)

```
GET  /notifications                    → operationId: getNotifications
PUT  /notifications/{id}/read          → operationId: markNotificationRead
PUT  /notifications/read-all           → operationId: markAllNotificationsRead
POST /notifications/check-overdue      → operationId: checkOverdueNotifications
```
Schemas: `Notification`
Commit: `"docs: add swagger JSDoc to notification routes"`

### 7e — notification-settings.routes.ts (4 routes)

```
GET  /notification-settings            → operationId: getNotificationSettings
PUT  /notification-settings            → operationId: updateNotificationSettings
POST /notification-settings/test       → operationId: testNotification
GET  /notification-settings/defaults   → operationId: getDefaultSettings
```
Schemas: `NotificationSettings`, `UpdateNotificationSettingsRequest`
Commit: `"docs: add swagger JSDoc to notification-settings routes"`

### 7f — overdue-penalty.routes.ts (5 routes)

```
GET  /overdue-penalty/settings         → operationId: getPenaltySettings
PUT  /overdue-penalty/settings         → operationId: updatePenaltySettings
POST /overdue-penalty/process          → operationId: processOverdue
GET  /overdue-penalty/chores           → operationId: getOverdueChores
GET  /overdue-penalty/history          → operationId: getPenaltyHistory
```
Schemas: `UpdatePenaltySettingsRequest`, `OverdueChore`, `PenaltyRecord`
Commit: `"docs: add swagger JSDoc to overdue-penalty routes"`

### 7g — recurring-chores.routes.ts (11 routes)

```
GET   /recurring-chores                         → operationId: listRecurringChores
POST  /recurring-chores                         → operationId: createRecurringChore
GET   /recurring-chores/occurrences             → operationId: listOccurrences
POST  /recurring-chores/trigger-occurrences     → operationId: triggerOccurrences
GET   /recurring-chores/{id}                    → operationId: getRecurringChore
PUT   /recurring-chores/{id}                    → operationId: updateRecurringChore
DELETE /recurring-chores/{id}                   → operationId: deleteRecurringChore
PATCH /recurring-chores/{id}/toggle-active      → operationId: toggleRecurringChoreActive
PATCH /recurring-chores/occurrences/{id}/complete → operationId: completeOccurrence
PATCH /recurring-chores/occurrences/{id}/skip   → operationId: skipOccurrence
PATCH /recurring-chores/occurrences/{id}/unskip → operationId: unskipOccurrence
```
Schemas: `CreateRecurringChoreRequest`, `UpdateRecurringChoreRequest`, `RecurringChore`, `ChoreOccurrence`, `CompleteOccurrenceRequest`, `SkipOccurrenceRequest`, `ToggleActiveRequest`
Commit: `"docs: add swagger JSDoc to recurring-chore routes"`

### 7h — pocket-money.routes.ts (10 routes)

```
GET  /pocket-money/config              → operationId: getPocketMoneyConfig
PUT  /pocket-money/config              → operationId: updatePocketMoneyConfig
GET  /pocket-money/balance/{userId}    → operationId: getPointBalance
GET  /pocket-money/transactions/{userId} → operationId: getTransactionHistory
POST /pocket-money/bonus               → operationId: addBonus
POST /pocket-money/deduction           → operationId: addDeduction
POST /pocket-money/advance             → operationId: grantAdvance
GET  /pocket-money/payouts/{userId}    → operationId: getPayouts
POST /pocket-money/payout              → operationId: createPayout
GET  /pocket-money/projected/{userId}  → operationId: getProjectedEarnings
```
Schemas: `PocketMoneyConfig`, `PointTransaction`, `AddBonusRequest`, `AddDeductionRequest`, `AddAdvanceRequest`, `CreatePayoutRequest`, `TransactionResponse`
Commit: `"docs: add swagger JSDoc to pocket-money routes"`

### 7i — statistics.routes.ts (2 routes)

```
GET /statistics/family                 → operationId: getFamilyStats
GET /statistics/child/{childId}        → operationId: getChildStats
```
Schemas: `FamilyStatistics`, `ChildStatistics`
Commit: `"docs: add swagger JSDoc to statistics routes"`

### 7j — audit.routes.ts (1 route)

```
GET /audit                             → operationId: getAuditLogs
```
Schema: `AuditLog`
Commit: `"docs: add swagger JSDoc to audit routes"`

### 7k — metrics.routes.ts (1 route)

```
GET /metrics                           → operationId: getMetrics
```
Response: `text/plain` Prometheus format
Commit: `"docs: add swagger JSDoc to metrics route"`

---

## Task 8: Run Generation + Verify Output

- [ ] **Step 1: Run the generator**

```bash
cd backend
npm run docs:generate
```

Expected output:
```
✓ Generated docs/swagger.json (61 paths)
```

- [ ] **Step 2: Verify path count**

```bash
python3 -c "import json; s=json.load(open('docs/swagger.json')); print(len(s['paths']), 'paths')"
```

Expected: `61 paths`

- [ ] **Step 3: Validate JSON is well-formed**

```bash
python3 -c "import json; json.load(open('docs/swagger.json')); print('valid JSON')"
```

Expected: `valid JSON`

- [ ] **Step 4: Commit the regenerated swagger.json**

```bash
git add docs/swagger.json backend/src/swagger.config.ts
git commit -m "docs: regenerate swagger.json from jsdoc source"
```

---

## Task 9: Add CI Validation Step

**Files:**
- Modify: `.github/workflows/ci-cd.yml`

Add a step in the **Backend Tests & Build** job after `npm run prisma:generate` and before `npm run test:coverage`:

- [ ] **Step 1: Add validation step to ci-cd.yml**

```yaml
      - name: Validate Swagger docs are up to date
        working-directory: backend
        run: npm run docs:validate
```

This ensures that if someone adds a route without regenerating docs, CI fails with a clear error message.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: validate swagger.json is up to date on every build"
```

---

## Task 10: Create PR

- [ ] **Step 1: Push and open PR**

```bash
git push origin HEAD
gh pr create \
  --title "feat: implement swagger-jsdoc for auto-generated API documentation" \
  --body "$(cat <<'EOF'
## Summary
- Installs `swagger-jsdoc` and wires it to all 61 API route files
- Replaces hand-maintained `docs/swagger.json` with one generated from `@swagger` JSDoc annotations co-located with route definitions
- Adds `npm run docs:generate` to regenerate docs and `npm run docs:validate` for CI
- CI now fails if routes are added/changed without regenerating docs

## How to update docs going forward
\`\`\`bash
# After changing any route file:
cd backend && npm run docs:generate
git add docs/swagger.json
\`\`\`

## Test plan
- [ ] `npm run docs:generate` produces `docs/swagger.json` with 61 paths
- [ ] `npm run docs:validate` passes against the freshly generated file
- [ ] CI `Validate Swagger docs are up to date` step passes
- [ ] Swagger UI (via `/api-docs` or an external viewer) renders all routes correctly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Verification Summary

| Check | Command | Expected |
|-------|---------|----------|
| Generates correctly | `cd backend && npm run docs:generate` | `✓ Generated docs/swagger.json (61 paths)` |
| Validates correctly | `cd backend && npm run docs:validate` | `✓ docs/swagger.json is up to date` |
| Path count | `python3 -c "import json; s=json.load(open('docs/swagger.json')); print(len(s['paths']))"` | `61` |
| Valid JSON | `python3 -m json.tool docs/swagger.json > /dev/null` | No output (exit 0) |
