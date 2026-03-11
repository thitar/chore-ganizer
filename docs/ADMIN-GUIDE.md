# Chore-Ganizer Admin Guide

## Version 2.1.7

This guide is for parents and administrators who manage the Chore-Ganizer application. As an admin (Parent role), you have access to manage chores and view family member information.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Navigation & Routing](#navigation--routing)
3. [User Management](#user-management)
4. [Chore Management](#chore-management)
5. [Email Notifications](#email-notifications)
6. [Progressive Web App (PWA)](#progressive-web-app-pwa)
7. [Statistics Dashboard](#statistics-dashboard)
8. [Database Administration](#database-administration)
9. [API Security Features](#api-security-features)
10. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Default Login Credentials

The application comes with demo users pre-seeded in the database:

**Parent Accounts:**
- Email: `dad@home.local` / Password: `password123`
- Email: `mom@home.local` / Password: `password123`

**Child Accounts:**
- Email: `alice@home.local` / Password: `password123`
- Email: `bob@home.local` / Password: `password123`

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
| `/recurring-chores` | Recurring chores management | All users |
| `/pocket-money` | Points/balance management | All users |
| `/profile` | User profile page | All users |
| `/users` | Family members management | Parents only |
| `/templates` | Chore templates management | Parents only |
| `/calendar` | Family calendar view | Parents only |
| `/statistics` | Statistics dashboard | Parents only |

### Protected Routes

The following routes are **protected** and only accessible to users with the `PARENT` role:

- **`/templates`** - Chore templates management
- **`/calendar`** - Family calendar view
- **`/statistics`** - Statistics dashboard
- **`/pocket-money`** - Pocket money configuration

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

## Email Notifications

Chore-Ganizer v2.0.0 includes email notifications via SMTP. Family members receive email alerts for important chore events.

### Configuration

Configure email notifications through environment variables:

```bash
# Enable/disable email notifications
SMTP_ENABLED=true

# SMTP server settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false          # Use true for port 465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sender information
SMTP_FROM_NAME=Chore-Ganizer
SMTP_FROM_ADDRESS=noreply@yourdomain.com
```

### Notification Types

| Event | Recipient | Description |
|-------|-----------|-------------|
| **Chore Assigned** | Assigned user | New chore has been assigned to you |
| **Chore Completed** | Parents | A child has completed their chore |
| **Points Earned** | User who earned | You earned X points for completing a chore |

### Setting Up Gmail SMTP

1. Enable 2-factor authentication on your Google account
2. Go to Google Account Settings → Security → App passwords
3. Generate a new app password for "Mail"
4. Use the generated password as `SMTP_PASS`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Setting Up Other SMTP Providers

**Outlook/Office 365:**
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**Custom SMTP Server:**
```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-username
SMTP_PASS=your-password
```

### Testing Email Configuration

Test your email setup by viewing the backend logs:

```bash
docker logs chore-ganizer-backend | grep -i email
```

When a notification is sent, you'll see log entries indicating success or failure.

---

## Progressive Web App (PWA)

Chore-Ganizer v2.0.0 is a Progressive Web App, meaning it can be installed on devices and works offline.

### Installing the App

**On Desktop (Chrome/Edge):**
1. Navigate to the application URL
2. Look for the install icon in the address bar (⊕ or download icon)
3. Click "Install" when prompted
4. The app will be added to your desktop/start menu

**On Mobile (iOS/Safari):**
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"

**On Mobile (Android/Chrome):**
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Confirm the installation

### Offline Capabilities

The app works offline with the following features:
- View cached chore assignments
- View cached templates and user data
- Complete chores while offline (synced when back online)
- Basic navigation works without internet

### PWA Benefits

- **Fast Loading:** Cached resources load instantly
- **Offline Access:** Core features work without internet
- **Home Screen Icon:** Quick access like a native app
- **Full Screen:** Runs without browser UI
- **Push Notifications:** (Future feature)

### Managing PWA Cache

To clear the PWA cache and refresh:

1. Open browser developer tools (F12)
2. Go to Application → Storage
3. Click "Clear site data"
4. Refresh the page

---

## Statistics Dashboard

The Statistics Dashboard provides insights into family chore activity and trends. Access it at `/statistics` (parents only).

### Features

#### Completion Rates
- Overall completion percentage
- Completion rates by family member
- Completion rates by chore category
- Weekly and monthly trends

#### Point Trends
- Point accumulation over time
- Point distribution by family member
- Average points per day/week/month
- Historical comparisons

#### Activity Feed
- Recent chore completions
- New assignments
- Point awards
- Chronological activity log

### Accessing Statistics

1. Log in as a parent
2. Click **Statistics** in the sidebar
3. View the dashboard with:
   - Summary cards with key metrics
   - Charts showing trends
   - Activity feed with recent events

### Using Statistics

**Track Progress:**
- See which family members are most active
- Identify chores that are frequently skipped
- Monitor point accumulation trends

**Make Decisions:**
- Adjust point values based on completion rates
- Reassign chores if certain ones are consistently late
- Reward family members with high completion rates

**Export Data:**
- Statistics are calculated in real-time from the database
- Use the API endpoints for custom reporting

---

## Recurring Chores Management

Chore-Ganizer supports automated recurring chores with flexible scheduling!

### Creating Recurring Chores

1. Go to **Recurring Chores** page
2. Click **Create Recurring Chore** button
3. Fill in the details:
   - **Title:** Name of the chore
   - **Description:** Instructions
   - **Points:** Point value for completion
   - **Category:** Organize by type (optional)

### Setting Recurrence Pattern

Choose how often the chore repeats:

| Frequency | Options |
|-----------|---------|
| Daily | Every day, Every N days |
| Weekly | Specific days (Mon/Wed/Fri), Every N weeks |
| Monthly | Day of month (15th), Nth weekday (2nd Tuesday) |
| Yearly | Specific date each year |

### Assignment Modes

Choose who gets assigned:

| Mode | Description |
|------|-------------|
| Fixed | Same person always gets assigned |
| Round Robin | Rotates through selected family members |
| Mixed | Fixed assignees + rotating person |

### Managing Occurrences

- **Complete:** Mark as done (awards points)
- **Skip:** Mark as skipped (no points)
- **Unskip:** Restore a skipped occurrence

---

## Pocket Money Management

The Pocket Money system converts points to actual currency!

### Configuring Pocket Money

1. Go to **Pocket Money** page
2. Click **Configuration** or **Settings**
3. Set the following:

| Setting | Description | Example |
|---------|-------------|---------|
| Point Value | Cents per point | 10 = €0.10 |
| Currency | Currency code | EUR, USD |
| Payout Period | Weekly or Monthly | MONTHLY |
| Payout Day | Day of week/month | 15th of month |
| Allow Advances | Allow early withdrawals | Yes/No |
| Max Advance | Max points for advances | 50 points |

### Managing Point Transactions

#### Adding Bonus Points

Reward children for good behavior:

1. Go to **Pocket Money** page
2. Find the child's card
3. Click **Add Bonus**
4. Enter points and reason

#### Deducting Points

Deduct points for broken items or other reasons:

1. Go to **Pocket Money** page
2. Find the child's card
3. Click **Deduct**
4. Enter points and reason

### Processing Payouts

When it's time to pay out:

1. Go to **Pocket Money** page
2. View pending points for each child
3. Click **Pay Out** for each child
4. Record the actual payment (cash, bank transfer, etc.)

### Viewing Transaction History

All point changes are tracked:

1. Go to **Pocket Money** page
2. Click on a child's card
3. View transaction history
4. Filter by type, date range

---

## Notification Settings Management

Parents can configure notification settings for the family and individual users.

### Configuring Global Notifications

1. Go to **Settings** or **Notification Settings**
2. Configure email SMTP settings (if enabled)
3. Set up ntfy.sh for push notifications

### User Notification Preferences

Each user can customize their notifications:

1. Go to **Family Members**
2. Click on a member
3. Edit **Notification Settings**

Available options:
- Email notifications (on/off)
- Push notifications via ntfy
- Alert types to receive
- Quiet hours

## ntfy.sh Push Notifications Setup

ntfy.sh is a free push notification service that lets you receive notifications on your phone or desktop without setting up your own notification server.

### What is ntfy?

- **Free and open-source** push notification service
- **No registration required** - just create your own topic
- **Multi-platform** - works on iOS, Android, and desktop
- **Self-host option** available if you want your own server

### Setting Up ntfy for Your Family

#### Step 1: Create Your ntfy Topic

1. Visit https://ntfy.sh/
2. Click **Subscribe** in the top navigation
3. Choose a unique topic name (e.g., "chore-ganizer-family")
4. This topic will be used for all family notifications
5. **Save your topic name** - you'll need it for configuration

> **Security Tip:** Choose a random/obscure topic name to prevent others from subscribing to your notifications.

#### Step 2: Install the ntfy App

**On iOS:**
1. Open App Store and search for "ntfy"
2. Install the ntfy app
3. Open the app and tap **Subscribe**
4. Enter your topic name (e.g., `chore-ganizer-family`)
5. Tap Subscribe

**On Android:**
1. Open Play Store and search for "ntfy"
2. Install the ntfy app
3. Open the app and tap **Subscribe**
4. Enter your topic name
5. Tap Subscribe

**On Desktop:**
1. Visit https://ntfy.sh/
2. Click your topic link
3. Enable notifications in browser settings

#### Step 3: Configure Chore-Ganizer

1. Open the Chore-Ganizer .env file
2. Add or update these variables:

```bash
# ntfy Configuration
NTFY_ENABLED=true
NTFY_TOPIC=chore-ganizer-family
# Optional: Set your own ntfy server (default is ntfy.sh)
# NTFY_SERVER=https://ntfy.sh
```

3. Restart the Chore-Ganizer containers:

```bash
docker-compose down
docker-compose up -d
```

#### Step 4: Configure User Notifications

Each family member can enable push notifications:

1. Log in as the user
2. Go to **Profile** → **Notification Settings**
3. Enable **Push Notifications (ntfy)**
4. Enter the same topic name (or leave blank to use default)

### Customizing Notifications

You can choose which events trigger ntfy notifications:

| Event | Description |
|-------|-------------|
| New chore assigned | When a chore is assigned to you |
| Chore due soon | Reminder before due date |
| Chore completed | When a chore is marked complete |
| Chore overdue | When a chore passes its due date |
| Points earned | When you earn points |

### Troubleshooting ntfy

**Not receiving notifications:**
- Check that ntfy is enabled in your profile settings
- Verify the topic name matches exactly
- Check that you're subscribed to the correct topic
- Try enabling/disabling the notification in the ntfy app

**Notifications delayed:**
- ntfy.sh is a free service and may have delays
- Consider self-hosting ntfy for faster delivery
- Check your internet connection

**Too many notifications:**
- Adjust quiet hours in notification settings
- Disable specific notification types

---

## Overdue Penalty System

Automatically apply penalties for overdue chores.

### Enabling Overdue Penalties

1. Go to **Overdue Penalty** or **Settings** page
2. Enable penalty system
3. Set penalty multiplier (e.g., 2x = double points deducted)

### How It Works

When a chore becomes overdue:
1. System detects overdue chore
2. Penalty points are calculated (chore points × multiplier)
3. Points are deducted from the assigned user
4. Parent is notified

### Viewing Penalty History

1. Go to **Overdue Penalty** page
2. View history of applied penalties
3. See which chores triggered penalties

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

#### Managing Users via UI

The Family Members page (accessible from the sidebar) provides a user-friendly interface for managing family members:

**View Family Members:**
1. Go to **Family Members** in the sidebar
2. View all family members in a sortable table
3. Click column headers (Name, Email, Role, Points) to sort
4. Each member shows their color indicator and account status

**Create a New User:**
1. Go to **Family Members** in the sidebar
2. Click **Add User** button
3. Fill in the form:
   - Name, Email, Password (8+ chars with uppercase, lowercase, number, special char)
   - Role (Parent or Child)
   - Color (choose from presets or enter custom hex)
   - Base Pocket Money (for children)
4. Click **Create User**

**Edit a User:**
1. Click **Edit** next to the user
2. Modify name, email, role, color, or pocket money
3. Click **Save Changes**

**Lock/Unlock Account:**
- Click **Lock** to prevent a child from logging in
- Click **Unlock** to restore access

**Delete a User:**
1. Click **Delete** (users with active assignments cannot be deleted)
2. Confirm in the dialog

---

#### View All Users (Database)

```sql
SELECT id, email, name, role, points FROM User;
```

#### Create a New User

```sql
-- Password is hashed with bcrypt. Use the API or copy hash from existing user for testing.
INSERT INTO User (email, name, password, role, points, createdAt, updatedAt)
VALUES ('newuser@home.local', 'New User', '$2b$10$...', 'CHILD', 0, datetime('now'), datetime('now'));
```

> **Note:** For production, use the API endpoint `POST /api/auth/register` to create users with properly hashed passwords.

#### Reset a User's Password

```sql
-- First, get a properly hashed password (create via API or use existing)
-- This example sets password to "newpassword123" (you need the bcrypt hash)
UPDATE User SET password = '$2b$10$...' WHERE email = 'user@home.local';
```

#### Adjust User Points

```sql
-- Add 50 points to a user
UPDATE User SET points = points + 50 WHERE email = 'alice@home.local';

-- Set specific point value
UPDATE User SET points = 100 WHERE email = 'bob@home.local';
```

#### Change User Role

```sql
-- Promote to parent
UPDATE User SET role = 'PARENT' WHERE email = 'user@home.local';

-- Demote to child
UPDATE User SET role = 'CHILD' WHERE email = 'user@home.local';
```

#### Delete a User

```sql
-- First unassign their chores
UPDATE ChoreAssignment SET assignedToId = NULL WHERE assignedToId = (SELECT id FROM User WHERE email = 'user@home.local');

-- Then delete the user
DELETE FROM User WHERE email = 'user@home.local';
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
  -d '{"email":"newuser@home.local","password":"password123","name":"New User","role":"CHILD"}'
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
     -d '{"email":"newuser@home.local","password":"SecurePass123!","name":"New User","role":"CHILD"}'
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
- Check the database: `SELECT points FROM User WHERE email = 'user@home.local'`

**Email notifications not sending:**
- Check SMTP configuration in environment variables
- Verify SMTP credentials are correct
- Check backend logs for error messages
- Test SMTP connection manually

**PWA not installing:**
- Ensure you're using HTTPS (required for PWA)
- Check browser compatibility (Chrome, Edge, Safari)
- Clear browser cache and try again

**Offline mode not working:**
- Service worker may need to be registered
- Clear site data and refresh
- Check browser developer tools → Application → Service Workers

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
8. **Use HTTPS** for production deployments (required for PWA features)
9. **Secure SMTP credentials** - use app passwords when possible

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
| Email Notifications | ✅ | ✅ | ✅ |
| PWA Support | ✅ | N/A | N/A |
| Statistics Dashboard | ✅ (Parents) | ✅ | ✅ |
| Offline Support | ✅ | N/A | N/A |

---

*For API details, see [API-DOCUMENTATION.md](API-DOCUMENTATION.md)*
