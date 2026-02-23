# 📡 Chore-Ganizer API Documentation

Complete REST API reference for Chore-Ganizer backend.

---

## 📋 Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Codes](#error-codes)
5. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Chore Templates](#chore-templates-endpoints)
   - [Chore Assignments](#chore-assignments-endpoints)
   - [Chore Categories](#chore-categories-endpoints)
   - [Notifications](#notifications-endpoints)
   - [Audit Logs](#audit-logs-endpoints)
   - [Health](#health-endpoints)

---

## 🔗 Base URL

**Development (direct):** `http://localhost:3010/api`  
**Production (via nginx proxy):** `http://YOUR_SERVER_IP:3002/api`  
**Example:** `http://docker.lab:3002/api`

> **Note:** In production, the frontend nginx proxies `/api` requests to the backend container.

---

## 🔐 Authentication

Chore-Ganizer uses session-based authentication. Sessions are managed via cookies.

### How to Authenticate

1. Login via [`POST /api/auth/login`](#post-apiauthlogin)
2. Session cookie is automatically set and sent with subsequent requests
3. Session expires after 7 days (configurable via `SESSION_MAX_AGE`)

### Session Cookie

```
Cookie: connect.sid=<session_id>
```

### Role-Based Access

| Role | Capabilities |
|------|--------------|
| `PARENT` | Full access: create, edit, delete chores; manage users; view all data |
| `CHILD` | Limited access: view assigned chores; mark complete; view own points |

---

## 📦 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## ❌ Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated or session expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🛣️ Endpoints

---

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@home",
  "password": "password123",
  "name": "New User",
  "role": "CHILD"
}
```

**Validation Rules:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email, unique |
| `password` | string | Yes | Min 6 characters |
| `name` | string | Yes | 1-100 characters |
| `role` | string | No | `PARENT` or `CHILD`, defaults to `CHILD` |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "email": "newuser@home",
      "name": "New User",
      "role": "CHILD",
      "points": 0,
      "createdAt": "2026-02-10T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400` - Invalid input data
- `409` - Email already exists

---

#### POST `/api/auth/login`

Authenticate a user and create a session.

**Request Body:**
```json
{
  "email": "dad@home",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "dad@home",
      "name": "Dad",
      "role": "PARENT",
      "points": 0,
      "createdAt": "2026-02-10T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400` - Invalid credentials
- `401` - Wrong password
- `404` - User not found

---

#### POST `/api/auth/logout`

End the current session.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

#### GET `/api/auth/me`

Get the currently authenticated user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "dad@home",
      "name": "Dad",
      "role": "PARENT",
      "points": 150,
      "createdAt": "2026-02-10T00:00:00.000Z"
    }
  }
}
```

---

### Users Endpoints

#### GET `/api/users`

Get all family members.

**Authentication:** Required  
**Role:** `PARENT` only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "dad@home",
        "name": "Dad",
        "role": "PARENT",
        "points": 150,
        "createdAt": "2026-02-10T00:00:00.000Z"
      },
      {
        "id": 2,
        "email": "alice@home",
        "name": "Alice",
        "role": "CHILD",
        "points": 75,
        "createdAt": "2026-02-10T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### GET `/api/users/:id`

Get a specific user by ID.

**Authentication:** Required  
**Role:** `PARENT` only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "email": "alice@home",
      "name": "Alice",
      "role": "CHILD",
      "points": 75,
      "createdAt": "2026-02-10T00:00:00.000Z"
    }
  }
}
```

---

#### GET `/api/users/:id/chores`

Get all chores assigned to a specific user.

**Authentication:** Required  
**Role:** `PARENT` or own user (CHILD)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `all` | Filter by status: `pending`, `completed`, `all` |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chores": [
      {
        "id": 1,
        "title": "Clean bedroom",
        "description": "Make bed and pick up toys",
        "points": 10,
        "status": "PENDING",
        "assignedToId": 2,
        "assignedTo": {
          "id": 2,
          "name": "Alice"
        },
        "createdAt": "2026-02-10T00:00:00.000Z",
        "completedAt": null
      }
    ]
  }
}
```

---

### Chores Endpoints

#### GET `/api/chores`

Get all chores.

**Authentication:** Required  
**Role:** `PARENT` only

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `all` | Filter by status: `pending`, `completed`, `all` |
| `assignedTo` | number | - | Filter by assigned user ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chores": [
      {
        "id": 1,
        "title": "Clean bedroom",
        "description": "Make bed and pick up toys",
        "points": 10,
        "status": "PENDING",
        "assignedToId": 2,
        "assignedTo": {
          "id": 2,
          "name": "Alice"
        },
        "createdAt": "2026-02-10T00:00:00.000Z",
        "completedAt": null
      },
      {
        "id": 2,
        "title": "Do dishes",
        "description": "Wash and dry all dishes",
        "points": 15,
        "status": "COMPLETED",
        "assignedToId": 3,
        "assignedTo": {
          "id": 3,
          "name": "Bob"
        },
        "createdAt": "2026-02-09T00:00:00.000Z",
        "completedAt": "2026-02-10T12:00:00.000Z"
      }
    ]
  }
}
```

---

#### GET `/api/chores/:id`

Get a specific chore by ID.

**Authentication:** Required  
**Role:** `PARENT` or assigned user (CHILD)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chore": {
      "id": 1,
      "title": "Clean bedroom",
      "description": "Make bed and pick up toys",
      "points": 10,
      "status": "PENDING",
      "assignedToId": 2,
      "assignedTo": {
        "id": 2,
        "name": "Alice"
      },
      "createdAt": "2026-02-10T00:00:00.000Z",
      "completedAt": null
    }
  }
}
```

---

#### POST `/api/chores`

Create a new chore.

**Authentication:** Required  
**Role:** `PARENT` only

**Request Body:**
```json
{
  "title": "Clean bedroom",
  "description": "Make bed and pick up toys",
  "points": 10,
  "assignedToId": 2
}
```

**Validation Rules:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 1-100 characters |
| `description` | string | No | Max 500 characters |
| `points` | number | Yes | 1-1000 |
| `assignedToId` | number | Yes | Must be valid user ID |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "chore": {
      "id": 1,
      "title": "Clean bedroom",
      "description": "Make bed and pick up toys",
      "points": 10,
      "status": "PENDING",
      "assignedToId": 2,
      "assignedTo": {
        "id": 2,
        "name": "Alice"
      },
      "createdAt": "2026-02-10T00:00:00.000Z",
      "completedAt": null
    }
  }
}
```

---

#### PUT `/api/chores/:id`

Update an existing chore.

**Authentication:** Required  
**Role:** `PARENT` only

**Request Body:**
```json
{
  "title": "Clean bedroom (updated)",
  "description": "Make bed, pick up toys, and vacuum",
  "points": 15,
  "assignedToId": 3
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chore": {
      "id": 1,
      "title": "Clean bedroom (updated)",
      "description": "Make bed, pick up toys, and vacuum",
      "points": 15,
      "status": "PENDING",
      "assignedToId": 3,
      "assignedTo": {
        "id": 3,
        "name": "Bob"
      },
      "createdAt": "2026-02-10T00:00:00.000Z",
      "completedAt": null
    }
  }
}
```

---

#### DELETE `/api/chores/:id`

Delete a chore.

**Authentication:** Required  
**Role:** `PARENT` only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Chore deleted successfully"
  }
}
```

---

#### POST `/api/chores/:id/complete`

Mark a chore as completed and award points.

**Authentication:** Required  
**Role:** `PARENT` or assigned user (CHILD)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chore": {
      "id": 1,
      "title": "Clean bedroom",
      "description": "Make bed and pick up toys",
      "points": 10,
      "status": "COMPLETED",
      "assignedToId": 2,
      "assignedTo": {
        "id": 2,
        "name": "Alice"
      },
      "createdAt": "2026-02-10T00:00:00.000Z",
      "completedAt": "2026-02-10T14:30:00.000Z"
    },
    "pointsAwarded": 10,
    "userPoints": 85
  }
}
```

---

### Notifications Endpoints

#### GET `/api/notifications`

Get all notifications for the current user.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `unread` | boolean | `false` | Filter by unread status only |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "userId": 2,
        "type": "CHORE_ASSIGNED",
        "title": "New chore assigned",
        "message": "You have been assigned: Clean bedroom",
        "read": false,
        "createdAt": "2026-02-10T10:00:00.000Z"
      },
      {
        "id": 2,
        "userId": 2,
        "type": "POINTS_EARNED",
        "title": "Points earned!",
        "message": "You earned 10 points for completing: Clean bedroom",
        "read": true,
        "createdAt": "2026-02-10T14:30:00.000Z"
      }
    ]
  }
}
```

---

#### PUT `/api/notifications/:id/read`

Mark a notification as read.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": 1,
      "userId": 2,
      "type": "CHORE_ASSIGNED",
      "title": "New chore assigned",
      "message": "You have been assigned: Clean bedroom",
      "read": true,
      "createdAt": "2026-02-10T10:00:00.000Z"
    }
  }
}
```

---

#### PUT `/api/notifications/read-all`

Mark all notifications as read for the current user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "count": 5
  }
}
```

---

### Audit Logs Endpoints

#### GET `/api/audit`

Get audit logs (parents only).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | number | Filter by user ID |
| `action` | string | Filter by action type (e.g., USER_LOGIN, CHORE_COMPLETED) |
| `entityType` | string | Filter by entity type (e.g., User, ChoreAssignment) |
| `startDate` | string | Filter by start date (ISO 8601) |
| `endDate` | string | Filter by end date (ISO 8601) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "userId": 2,
        "action": "USER_LOGIN",
        "entityType": "User",
        "entityId": 2,
        "oldValue": null,
        "newValue": null,
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-02-19T12:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

**Action Types:**
- `USER_LOGIN`, `USER_LOGOUT`, `USER_LOGIN_FAILED`
- `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`
- `CHORE_ASSIGNED`, `CHORE_COMPLETED`, `CHORE_UPDATED`, `CHORE_DELETED`
- `RECURRING_CHORE_CREATED`, `RECURRING_CHORE_UPDATED`, `RECURRING_CHORE_DELETED`
- `PAYOUT_CREATED`, `PAYOUT_UPDATED`, `PAYOUT_CANCELLED`
- `POINTS_BONUS_ADDED`, `POINTS_DEDUCTION_ADDED`
- `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `ACCOUNT_UNLOCKED_BY_ADMIN`

---

### Health Endpoints

#### GET `/api/health`

Health check endpoint (no authentication required).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-10T20:00:00.000Z"
  }
}
```

---

## 📊 Data Models

### User

```typescript
{
  id: number;
  email: string;
  name: string;
  role: 'PARENT' | 'CHILD';
  points: number;
  createdAt: Date;
}
```

### Chore

```typescript
{
  id: number;
  title: string;
  description: string | null;
  points: number;
  status: 'PENDING' | 'COMPLETED';
  assignedToId: number;
  assignedTo: { id: number; name: string };
  createdAt: Date;
  completedAt: Date | null;
}
```

### Notification

```typescript
{
  id: number;
  userId: number;
  type: 'CHORE_ASSIGNED' | 'CHORE_COMPLETED' | 'POINTS_EARNED';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Login (via nginx proxy)
curl -X POST http://docker.lab:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"dad@home","password":"password123"}'

# Get all chores (using session cookie)
curl -X GET http://docker.lab:3002/api/chores \
  -b cookies.txt

# Create a chore
curl -X POST http://docker.lab:3002/api/chores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Clean room","description":"Make bed","points":10,"assignedToId":2}'
```

### Using Postman/Insomnia

1. Import the OpenAPI spec from `docs/swagger.json`
2. Set base URL: `http://docker.lab:3002/api` (or your server URL)
3. Enable cookie handling in settings
4. Login first, then use the session for subsequent requests

---

## 📝 Future Endpoints (Planned)

The following endpoints are planned for future releases:

- `POST /api/rewards` - Create a reward (parents only)
- `GET /api/rewards` - Get all available rewards
- `POST /api/rewards/:id/redeem` - Redeem a reward (children only)
- `POST /api/chores/:id/recurring` - Set up recurring chores
- `GET /api/analytics` - Get family analytics (parents only)

---

## ⚠️ Deprecated Endpoints

> **Note:** The following endpoints from the old chore system have been deprecated:

| Deprecated Endpoint | Replacement |
|-------------------|-------------|
| `GET /api/chores` | `GET /api/chore-assignments` |
| `GET /api/chores/:id` | `GET /api/chore-assignments/:id` |
| `POST /api/chores` | `POST /api/chore-assignments` (requires template) |
| `PUT /api/chores/:id` | `PUT /api/chore-assignments/:id` |
| `DELETE /api/chores/:id` | `DELETE /api/chore-assignments/:id` |
| `POST /api/chores/:id/complete` | `POST /api/chore-assignments/:id/complete` |

### New Chore Templates System

The new system uses **Chore Templates** (reusable chore definitions) and **Chore Assignments** (instances assigned to users with due dates).

#### Chore Template Object
```typescript
{
  id: number;
  title: string;
  description: string | null;
  points: number;
  icon: string | null;
  color: string | null;
  categoryId: number | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Chore Assignment Object
```typescript
{
  id: number;
  choreTemplateId: number;
  choreTemplate: ChoreTemplate;
  assignedToId: number;
  assignedTo: { id: number; name: string };
  assignedById: number;
  assignedBy: { id: number; name: string };
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  isOverdue: boolean;
}
```

---

### Chore Templates Endpoints

#### GET `/api/chore-templates`

Get all chore templates.

**Authentication:** Required  
**Role:** Any authenticated user

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `categoryId` | number | - | Filter by category |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "title": "Clean bedroom",
        "description": "Make bed and pick up toys",
        "points": 10,
        "icon": null,
        "color": "#FF5733",
        "categoryId": 1,
        "createdById": 1,
        "createdAt": "2026-02-13T00:00:00.000Z",
        "updatedAt": "2026-02-13T00:00:00.000Z"
      }
    ]
  }
}
```

#### POST `/api/chore-templates`

Create a new chore template.

**Authentication:** Required  
**Role:** `PARENT` only

**Request Body:**
```json
{
  "title": "Clean bedroom",
  "description": "Make bed and pick up toys",
  "points": 10,
  "icon": "🧹",
  "color": "#FF5733",
  "categoryId": 1
}
```

---

### Chore Assignments Endpoints

#### GET `/api/chore-assignments`

Get all chore assignments.

**Authentication:** Required  
**Role:** Any authenticated user

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status: `PENDING`, `COMPLETED` |
| `userId` | number | - | Filter by assigned user ID |
| `fromDate` | string | - | Filter from date (ISO) |
| `toDate` | string | - | Filter to date (ISO) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "choreTemplateId": 1,
        "choreTemplate": {
          "id": 1,
          "title": "Clean bedroom",
          "description": "Make bed and pick up toys",
          "points": 10
        },
        "assignedToId": 2,
        "assignedTo": { "id": 2, "name": "Alice" },
        "assignedById": 1,
        "assignedBy": { "id": 1, "name": "Dad" },
        "dueDate": "2026-02-15T23:59:59.999Z",
        "status": "PENDING",
        "notes": null,
        "createdAt": "2026-02-13T00:00:00.000Z",
        "completedAt": null,
        "isOverdue": false
      }
    ]
  }
}
```

#### GET `/api/chore-assignments/upcoming`

Get upcoming assignments (next N days).

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 7 | Number of days to look ahead |

#### GET `/api/chore-assignments/overdue`

Get overdue assignments.

**Authentication:** Required

#### GET `/api/chore-assignments/calendar`

Get assignments for calendar view.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `year` | number | current year | Year for calendar |
| `month` | number | current month | Month for calendar |

#### POST `/api/chore-assignments`

Create a new chore assignment.

**Authentication:** Required  
**Role:** `PARENT` only

**Request Body:**
```json
{
  "templateId": 1,
  "assignedToId": 2,
  "dueDate": "2026-02-15"
}
```

#### POST `/api/chore-assignments/:id/complete`

Mark assignment as complete.

**Authentication:** Required  
**Role:** Assigned user or parent

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": { ... },
    "pointsAwarded": 10
  }
}
```

---

### Chore Categories Endpoints

#### GET `/api/chore-categories`

Get all chore categories.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Cleaning",
        "description": "Cleaning chores",
        "icon": "🧹",
        "color": "#FF5733",
        "createdAt": "2026-02-13T00:00:00.000Z",
        "updatedAt": "2026-02-13T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🧪 Testing the New API

```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"dad@home","password":"password123"}'

# Get all templates
curl -X GET http://localhost:3002/api/chore-templates \
  -b cookies.txt

# Get all assignments
curl -X GET http://localhost:3002/api/chore-assignments \
  -b cookies.txt

# Get upcoming assignments
curl -X GET "http://localhost:3002/api/chore-assignments/upcoming?days=7" \
  -b cookies.txt

# Create an assignment
curl -X POST http://localhost:3002/api/chore-assignments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"templateId":1,"assignedToId":2,"dueDate":"2026-02-20"}'

# Complete an assignment
curl -X POST http://localhost:3002/api/chore-assignments/1/complete \
  -b cookies.txt
```

---

**Last Updated:** February 2026  
**API Version:** 2.0.0
