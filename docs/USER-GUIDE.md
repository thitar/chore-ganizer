# Chore-Ganizer User Guide

## Welcome to Chore-Ganizer! 🏠

Chore-Ganizer is a family-friendly chore management app that helps families organize, track, and reward household chores.

## Getting Started

### Logging In

1. Open your web browser and navigate to the application URL
2. Enter your email address
3. Enter your password
4. Click **Sign In**
5. You'll be taken to your dashboard

> **Note:** Accounts are created by a parent. If you don't have an account, ask a parent to create one for you.

## Using the Dashboard

The dashboard shows an overview of **your** chore activity (personal view):

- **My Pending Chores:** Chores assigned to you that need to be done
- **My Completed Chores:** Chores you've finished
- **My Points:** Your current point total
- **Recent Activity:** Your latest chore completions

> **Personal Dashboard:** Each family member sees only their own data on the dashboard. Parents can view all family members' information on the Family Members page.

Parents also see a **Family Members** section showing all users and their point totals.

## Managing Chores

> **Note:** The chore system has been updated! Chores are now created from **Templates** and assigned to family members with **due dates**.

### Viewing Chores

1. Click **Chores** in the sidebar menu
2. You'll see a list of all chore assignments
3. Use the filter buttons to show:
   - **All** - All assignments
   - **Pending** - Chores not yet completed
   - **Completed** - Finished chores

### For Children: Completing Chores

1. Find a chore assigned to you in the list
2. Click **Complete** on the chore card
3. Points are automatically added to your total

> **Note:** Only chores assigned to you can be completed by you.

### For Parents: Creating Chore Assignments

1. Go to **Templates** page first to create chore templates (if needed)
2. Go to **Chores** page
3. Click **Create Chore** button
4. Fill in the details:
   - **Template:** Select which chore template to assign
   - **Assign To:** Select which family member should do this chore
   - **Due Date:** When the chore should be completed
5. Click **Create**

### For Parents: Managing Templates

1. Click **Templates** in the sidebar menu
2. View all available chore templates
3. Create new templates with:
   - **Title:** Name of the chore
   - **Description:** Instructions for completing the chore
   - **Points:** Point value for completing this chore
   - **Icon/Emoji:** Visual icon (optional)
   - **Color:** Color for the card (optional)

### For Parents: Editing or Deleting Chores

1. Find the chore in the list
2. Click **Edit** to modify the chore details
3. Click **Delete** to remove the chore

### For Parents: Partial Chore Completion

Sometimes a chore is only partially done. Parents can mark chores as partially complete:

1. Find the chore in the list
2. Click **Mark Partial** or use the completion menu
3. Enter the custom points to award (less than full value)
4. Optionally add notes explaining why it's partial
5. The chore status changes to **Partially Complete**

## Family Calendar

The Calendar page shows all family chore assignments in a visual calendar format:

1. Click **Calendar** in the sidebar menu
2. View chores organized by due date
3. Each family member has their own color for easy identification
4. Click on a chore to see details
5. Use the navigation arrows to move between months

> **User Colors:** Each family member is assigned a unique color that appears on the calendar. This makes it easy to see who is responsible for each chore at a glance.

## User Color Customization

Each family member has a personalized color that appears on:

- Calendar events
- Chore assignments
- Family member lists

Your color is automatically assigned when your account is created. Parents can view all family member colors on the Family Members page.

## Profile Page

View your profile information:

1. Click **Profile** in the sidebar
2. See your:
   - Name and email
   - Role (PARENT or CHILD)
   - Total points
   - Member since date

## Family Members (Parents Only)

Parents can view and manage all family members:

1. Click **Family Members** in the sidebar
2. See a list of all users with their:
   - Name
   - Email
   - Role (Parent or Child)
   - Point total
   - Personal color (shown on calendar)
3. View each member's assigned chores and completion history

> **Note:** Children do not see the Family Members or Templates pages in their navigation menu.

## Signing Out

1. Click **Logout** in the navigation bar
2. You'll be returned to the login page

## Notifications

Stay updated with in-app notifications:

1. Click the **notification bell** icon in the navigation bar
2. See notifications for:
   - New chore assignments
   - Chore completions (for parents)
   - Point awards
3. Click a notification to view the related chore

---

## Current Limitations

The following features are documented in the API but not yet available in the UI:

- **Creating new users** - Must be done via database or API
- **Editing users** - Must be done via database or API
- **Resetting passwords** - Must be done via database or API
- **Adjusting points manually** - Points are only awarded through chore completion

For these operations, ask your system administrator or see the [Admin Guide](ADMIN-GUIDE.md) for database commands.

---

*Happy chore completing! 🎉*
