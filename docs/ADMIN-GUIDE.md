# Chore-Ganizer Admin Guide

## Overview

This guide is for parents and administrators who manage the Chore-Ganizer application. As an admin (Parent role), you have full control over users, chores, and the reward system.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [User Management](#user-management)
3. [Chore Management](#chore-management)
4. [Points System](#points-system)
5. [Notifications](#notifications)
6. [Reports & Monitoring](#reports--monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### First-Time Setup

The application comes with demo users pre-seeded in the database. You can log in with these credentials:

**Demo Parent Accounts:**
- Email: `dad@home` / Password: `password123`
- Email: `mom@home` / Password: `password123`

**Demo Child Accounts:**
- Email: `alice@home` / Password: `password123`
- Email: `bob@home` / Password: `password123`

### Logging In

1. Navigate to the application URL
2. Enter your email address
3. Enter your password
4. Click **Login**
5. You'll be taken to the dashboard

### Creating New Parent Accounts

1. Log in as an existing parent
2. Go to **Users** → **Add User**
3. Fill in the details and select **PARENT** role
4. Share the login credentials with the other parent

---

## User Management

### Adding Family Members

1. Navigate to **Users** section
2. Click **Add User** button
3. Fill in the required information:
   - **Email:** Unique email address (required)
   - **Name:** Display name
   - **Password:** Initial password (user can change later)
   - **Role:** PARENT or CHILD
4. Click **Save**

### User Roles

| Role | Permissions |
|------|-------------|
| **PARENT** | Full access: manage users, chores, approve completions, view all data |
| **CHILD** | Limited access: view own chores, mark completions, view own points |

### Editing Users

1. Go to **Users** section
2. Click on the user's name
3. Make changes as needed:
   - Update name
   - Reset password
   - Adjust points
   - Change role
4. Click **Save**

### Resetting Passwords

1. Go to **Users** section
2. Click on the user
3. Click **Reset Password**
4. Enter a new temporary password
5. Share the new password with the user

### Deactivating Users

1. Go to **Users** section
2. Click on the user
3. Click **Deactivate**
4. The user will no longer be able to log in
5. Their historical data is preserved

---

## Chore Management

### Creating Chores

1. Navigate to **Chores** section
2. Click **Add Chore**
3. Fill in the details:
   - **Title:** Short, descriptive name
   - **Description:** Detailed instructions
   - **Points:** Point value for completion
   - **Assigned To:** Select family member(s)
   - **Due Date:** Optional deadline
   - **Recurring:** Set up repeat schedule (if enabled)
4. Click **Save**

### Chore Categories

Organize chores by category for easier management:
- **Daily:** Regular daily tasks (making bed, dishes)
- **Weekly:** Once-per-week tasks (vacuuming, laundry)
- **Monthly:** Deep cleaning tasks
- **Seasonal:** Yard work, garage cleaning

### Assigning Chores

**Single Assignment:**
1. Create or edit a chore
2. Select one family member from the dropdown
3. Save the chore

**Multiple Assignments:**
1. Create the chore once
2. Select multiple family members
3. Each person will see the chore in their list

### Editing Chores

1. Go to **Chores** section
2. Click on the chore name
3. Make your changes
4. Click **Save**

### Deleting Chores

1. Go to **Chores** section
2. Click on the chore
3. Click **Delete**
4. Confirm deletion
5. Note: Historical completion records are preserved

### Approving Completions

When a child marks a chore as complete:

1. You'll receive a notification
2. Go to **Pending Approvals** or the chore
3. Review the completion
4. Choose:
   - **Approve:** Points are awarded
   - **Reject:** Mark as incomplete, no points
   - **Partial:** Award partial points with feedback

---

## Points System

### Setting Point Values

Consider these factors when assigning points:
- **Time required:** More time = more points
- **Difficulty:** Harder tasks = more points
- **Frequency:** Daily tasks might be lower points
- **Age appropriateness:** Adjust for each child

### Suggested Point Scale

| Chore Type | Points |
|------------|--------|
| Simple daily (make bed) | 5-10 |
| Standard daily (dishes) | 10-20 |
| Weekly cleaning | 25-50 |
| Major tasks | 50-100 |

### Adjusting Points

1. Go to **Users** section
2. Click on the user
3. Find **Points Adjustment**
4. Enter positive or negative adjustment
5. Add a reason (visible to user)
6. Click **Adjust**

### Point Rewards

Set up a reward system:
1. Create a list of rewards with point costs
2. Display in a visible location
3. When a child wants to redeem:
   - Deduct the points
   - Record the redemption

---

## Notifications

### Notification Types

| Type | Recipients | Trigger |
|------|------------|---------|
| New Assignment | Assigned user | Chore assigned |
| Due Reminder | Assigned user | Before due date |
| Completion Pending | Parents | Chore marked complete |
| Approval/Rejection | Assigned user | Parent reviews |
| Point Adjustment | User | Points modified |

### Configuring Notifications

1. Go to **Settings** → **Notifications**
2. Enable/disable notification types
3. Set reminder timing (e.g., 1 day before due)
4. Configure email notifications (if enabled)

---

## Reports & Monitoring

### Dashboard Overview

The admin dashboard shows:
- Total active chores
- Pending approvals
- Recent completions
- Points leaderboard

### Viewing Reports

1. Go to **Reports** section
2. Select report type:
   - **Completion History:** All chore completions
   - **User Activity:** Individual user statistics
   - **Points Summary:** Points earned/spent
3. Filter by date range, user, or chore
4. Export to CSV if needed

### Monitoring Activity

1. Check the dashboard regularly
2. Review pending approvals promptly
3. Monitor point balances
4. Address any disputes quickly

---

## Troubleshooting

### Common Issues

**User can't log in:**
- Verify email is correct
- Reset password
- Check if account is active

**Chore not showing for user:**
- Verify chore is assigned to them
- Check chore status isn't completed
- Refresh the page

**Points not updating:**
- Check if completion was approved
- Look for pending approvals
- Verify point adjustment was saved

**Notifications not received:**
- Check notification settings
- Verify email configuration (if applicable)
- Check browser notification permissions

### Database Backup

Regular backups are recommended:

```bash
# Manual backup
./backup.sh

# Or copy the database file
cp /path/to/data/chore-ganizer.db ./backup/
```

### Application Logs

View logs for troubleshooting:

```bash
# Docker logs
docker logs chore-ganizer-backend
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
```

---

## Best Practices

1. **Regular Reviews:** Check pending approvals daily
2. **Fair Points:** Be consistent with point values
3. **Clear Instructions:** Write detailed chore descriptions
4. **Positive Reinforcement:** Use the points system to encourage
5. **Family Meetings:** Discuss chores and rewards together
6. **Age-Appropriate:** Assign chores suitable for each child's age
7. **Rotate Chores:** Prevent boredom by rotating assignments
8. **Celebrate Success:** Acknowledge achievements

---

## Security Recommendations

1. **Strong Passwords:** Use strong passwords for parent accounts
2. **Limited Access:** Only give parent role to actual parents
3. **Regular Updates:** Keep the application updated
4. **Secure Network:** Run on a secure home network
5. **Backup Regularly:** Maintain regular database backups

---

## Getting Help

- Check this documentation
- Review the [API Documentation](API-DOCUMENTATION.md)
- Check application logs for errors
- Contact the system administrator

---

*Happy managing! 🎯*
