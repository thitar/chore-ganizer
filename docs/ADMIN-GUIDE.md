# Chore-Ganizer Admin Guide

## Overview

This guide is for parents and administrators who manage the Chore-Ganizer application. As an admin (Parent role), you have access to manage chores and view family member information.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Navigation & Routing](#navigation--routing)
3. [User Management](#user-management)
4. [Chore Management](#chore-management)
5. [Database Administration](#database-administration)
6. [API Security Features](#api-security-features)
7. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Default Login Credentials

The application comes with demo users pre-seeded in the database:

**Parent Accounts:**
- Email: `dad@home` / Password: `password123`
- Email: `mom@home` / Password: `password123`

**Child Accounts:**
- Email: `alice@home` / Password: `password123`
- Email: `bob@home` / Password: `password123`

> **Security Note:** Change these passwords after initial setup using the SQL commands below.

### Logging In

1. Navigate to the application URL
2. Enter your email address
3. Enter your password
4. Click **Sign In**

---

## Navigation & Routing

The application uses **React Router v6** for URL-based navigation. All routes are proper browser URLs, not state-based navigation.

### Available Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard` | Main dashboard (personal view) | All users |
| `/chores` | Chore assignments list | All users |
| `/profile` | User profile page | All users |
| `/users` | Family members management | Parents only |
| `/templates` | Chore templates management | Parents only |
| `/calendar` | Family calendar view | Parents only |

### Protected Routes

The following routes are **protected** and only accessible to users with the `PARENT` role:

- **`/templates`** - Chore templates management
- **`/calendar`** - Family calendar view

Children attempting to access these routes will be redirected to the dashboard.

### Profile Access

The Profile page is accessed by clicking the **username** in the top-right corner of the navigation bar. There is no Profile link in the sidebar.

---

## User Management

### Current Limitations

The UI currently supports **viewing users only**. The following operations require database access or API calls:

- Creating new users
- Editing user information
- Resetting passwords
- Adjusting points manually
- Deactivating users

### Viewing Family Members

1. Log in as a parent
2. Click **Family Members** in the sidebar
3. View all registered users with their roles and point totals

---

## Chore Management

### Creating Chores from Templates

1. Go to **Chores** page
2. Click **Create Chore** button
3. Select a **Template** from the dropdown (optional)
4. Fill in the details:
   - **Title:** Short, descriptive name
   - **Description:** Detailed instructions
   - **Points:** Point value for completion
   - **Category:** Organize by type
   - **Assigned To:** Select family member
   - **Due Date:** When the chore should be completed
5. Click **Create**

### Managing Templates

As a parent, you can create and manage chore templates:

1. Go to **Templates** page (parents only)
2. Click **Create Template** to add a new reusable chore definition
3. Set template details:
   - **Title:** Name of the chore
   - **Description:** Instructions
   - **Points:** Default point value
   - **Category:** Organize templates by type
4. Templates can be selected when creating new chore assignments

### Editing Chores

1. Find the chore in the list
2. Click **Edit**
3. Modify the details
4. Click **Update**

### Deleting Chores

1. Find the chore in the list
2. Click **Delete**
3. Confirm the deletion

### Partial Chore Completion

Parents can mark chores as partially complete:

1. Find the chore in the list
2. Click **Mark Partial** or use the completion action
3. Enter custom points (less than full value)
4. Add notes explaining partial completion
5. The chore status changes to `PARTIALLY_COMPLETE`

### Chore Statuses

| Status | Description |
|--------|-------------|
| **PENDING** | Chore needs to be done |
| **IN_PROGRESS** | Chore is being worked on |
| **COMPLETED** | Finished, full points awarded |
| **PARTIALLY_COMPLETE** | Partially done, custom points awarded |

### Viewing Family Calendar

1. Go to **Calendar** page
2. View all family members' chore assignments
3. Each family member has their own color
4. Click on a chore to see details

---

## Database Administration

Since some user management features are not available in the UI, you can perform administrative tasks directly on the SQLite database.

### Accessing the Database

```bash
# Enter the backend container
docker exec -it chore-ganizer-backend /bin/bash

# Open the database
sqlite3 /app/data/chore-ganizer.db
```

Or from the host machine:

```bash
# If you have sqlite3 installed locally
sqlite3 /var/lib/docker/volumes/chore-ganizer-data/_data/chore-ganizer.db
```

### Useful SQL Queries

#### View All Users

```sql
SELECT id, email, name, role, points FROM User;
```

#### Create a New User

```sql
-- Password is hashed with bcrypt. Use the API or copy hash from existing user for testing.
INSERT INTO User (email, name, password, role, points, createdAt, updatedAt)
VALUES ('newuser@home', 'New User', '$2b$10$...', 'CHILD', 0, datetime('now'), datetime('now'));
```

> **Note:** For production, use the API endpoint `POST /api/auth/register` to create users with properly hashed passwords.

#### Reset a User's Password

```sql
-- First, get a properly hashed password (create via API or use existing)
-- This example sets password to "newpassword123" (you need the bcrypt hash)
UPDATE User SET password = '$2b$10$...' WHERE email = 'user@home';
```

#### Adjust User Points

```sql
-- Add 50 points to a user
UPDATE User SET points = points + 50 WHERE email = 'alice@home';

-- Set specific point value
UPDATE User SET points = 100 WHERE email = 'bob@home';
```

#### Change User Role

```sql
-- Promote to parent
UPDATE User SET role = 'PARENT' WHERE email = 'user@home';

-- Demote to child
UPDATE User SET role = 'CHILD' WHERE email = 'user@home';
```

#### Delete a User

```sql
-- First unassign their chores
UPDATE ChoreAssignment SET assignedToId = NULL WHERE assignedToId = (SELECT id FROM User WHERE email = 'user@home');

-- Then delete the user
DELETE FROM User WHERE email = 'user@home';
```

#### View All Chore Assignments

```sql
SELECT ca.id, ct.title, ca.status, ct.points, u.name as assigned_to, ca.dueDate
FROM ChoreAssignment ca
JOIN ChoreTemplate ct ON ca.choreTemplateId = ct.id
LEFT JOIN User u ON ca.assignedToId = u.id;
```

#### View All Chore Templates

```sql
SELECT id, title, description, points, category FROM ChoreTemplate;
```

#### View Notifications

```sql
SELECT n.id, n.type, n.message, u.name as user, n.isRead, n.createdAt 
FROM Notification n 
JOIN User u ON n.userId = u.id 
ORDER BY n.createdAt DESC;
```

### Using the API for User Creation

The recommended way to create users is via the API:

```bash
# Register a new user (requires authentication)
curl -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@home","password":"password123","name":"New User","role":"CHILD"}'
```

---

## API Security Features

### CSRF Protection

The API uses CSRF (Cross-Site Request Forgery) tokens to protect against unauthorized requests. The frontend automatically handles CSRF tokens, but if you're making direct API calls, you'll need to:

1. **Get a CSRF token:**
   ```bash
   curl -X GET http://localhost:3010/api/csrf-token \
     -H "Content-Type: application/json"
   ```

2. **Include the token in subsequent requests:**
   ```bash
   curl -X POST http://localhost:3010/api/auth/register \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
     -d '{"email":"newuser@home","password":"SecurePass123!","name":"New User","role":"CHILD"}'
   ```

### Password Requirements

All new passwords must meet the following requirements:
- **Minimum 8 characters**
- **At least one uppercase letter** (A-Z)
- **At least one lowercase letter** (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&* etc.)

### Input Validation

All API endpoints use Zod schema validation. Invalid inputs will return a `400 Bad Request` with details:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter"
      }
    ]
  }
}
```

### Validation Endpoints

The following validation schemas are applied:

| Endpoint | Validation Schema |
|----------|-------------------|
| `POST /api/auth/register` | Email, password strength, name |
| `POST /api/auth/login` | Email, password |
| `POST /api/users` | Email, password, name, role |
| `PUT /api/users/:id` | Name, email, role |
| `POST /api/templates` | Title, description, points |
| `PUT /api/templates/:id` | Title, description, points |
| `POST /api/assignments` | Template ID, assigned user, due date |
| `PUT /api/assignments/:id` | Status, points |
| `POST /api/categories` | Name, color |
| `PUT /api/categories/:id` | Name, color |

---

## Troubleshooting

### Common Issues

**User can't log in:**
- Verify email is correct (check database)
- Reset password using SQL above
- Check browser console for errors

**Chore not showing for user:**
- Verify chore is assigned to them (check `assignedToId` in database)
- Check chore status isn't already COMPLETED
- Refresh the page

**Points not updating:**
- Points are awarded when chore is marked complete
- Check the database: `SELECT points FROM User WHERE email = 'user@home'`

### Application Logs

```bash
# View backend logs
docker logs chore-ganizer-backend

# View frontend logs
docker logs chore-ganizer-frontend

# Follow logs in real-time
docker logs -f chore-ganizer-backend
```

### Restarting the Application

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Database Backup

```bash
# Create backup
docker exec chore-ganizer-backend sqlite3 /app/data/chore-ganizer.db ".backup /app/data/backup.db"

# Copy backup to host
docker cp chore-ganizer-backend:/app/data/backup.db ./chore-ganizer-backup-$(date +%Y%m%d).db
```

---

## Security Recommendations

1. **Change default passwords** after initial setup
2. **Use strong passwords** for parent accounts (8+ chars, uppercase, lowercase, number, special char)
3. **Limit parent role** to actual parents only
4. **Regular backups** of the database
5. **Run on secure network** (home network recommended)
6. **CSRF protection** is enabled - tokens required for API calls
7. **Input validation** enforced on all endpoints - invalid data returns 400 errors

---

## Feature Status

| Feature | UI | API | Database |
|---------|----|----|----------|
| Login/Logout | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |
| Personal Dashboard | ✅ | ✅ | ✅ |
| View Chores | ✅ | ✅ | ✅ |
| Create Chore | ✅ (Parents) | ✅ | ✅ |
| Edit Chore | ✅ (Parents) | ✅ | ✅ |
| Delete Chore | ✅ (Parents) | ✅ | ✅ |
| Complete Chore | ✅ (Children) | ✅ | ✅ |
| Partial Completion | ✅ (Parents) | ✅ | ✅ |
| Chore Templates | ✅ (Parents) | ✅ | ✅ |
| Chore Categories | ✅ | ✅ | ✅ |
| Calendar View | ✅ | ✅ | ✅ |
| User Color Customization | ✅ | ✅ | ✅ |
| View Profile | ✅ | ✅ | ✅ |
| View Users | ✅ (Parents) | ✅ | ✅ |
| Create User | ❌ | ✅ | ✅ |
| Edit User | ❌ | ❌ | ✅ |
| Reset Password | ❌ | ❌ | ✅ |
| Adjust Points | ❌ | ❌ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| Password Strength Indicator | ✅ | ✅ | N/A |
| CSRF Protection | N/A | ✅ | N/A |
| Input Validation | N/A | ✅ | N/A |

---

*For API details, see [API-DOCUMENTATION.md](API-DOCUMENTATION.md)*
