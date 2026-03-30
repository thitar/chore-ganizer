# Toast Notifications Implementation Plan

> **For agentic workers:** RECOMMENDED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task with review checkpoints.

**Goal:** Replace all inline success/error messages with Sonner toast notifications to eliminate layout shift.

**Architecture:** Install `sonner` library, add a global `<Toaster />` component to App.tsx, create optional toast helper for consistency, then systematically replace all `useState`/`setTimeout` notification patterns across 6 pages.

**Tech Stack:** Sonner (lightweight toast library), React 18, TypeScript

---

## File Structure

### New Files
- `frontend/src/utils/toast.ts` — Toast helper functions with predefined success/error configurations

### Modified Files
- `frontend/package.json` — Add sonner dependency
- `frontend/src/App.tsx` — Add `<Toaster />` component
- `frontend/src/pages/Users.tsx` — Replace inline notifications
- `frontend/src/pages/Dashboard.tsx` — Replace inline notifications
- `frontend/src/pages/Chores.tsx` — Replace inline notifications
- `frontend/src/pages/Profile.tsx` — Replace inline notifications
- `frontend/src/pages/PocketMoney.tsx` — Replace inline notifications
- `frontend/src/pages/Login.tsx` — Replace form-level errors with toasts (keep field errors inline)

---

## Task 1: Install Sonner Dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add sonner to package.json**

Open `frontend/package.json` and add `sonner` to dependencies (not devDependencies). Find the dependencies section and add:

```json
"sonner": "^1.3.0"
```

Example location in file — find this section:
```json
"dependencies": {
  "axios": "^1.7.2",
  "react": "^18.2.0",
  ...existing deps...
}
```

Add `"sonner": "^1.3.0"` to it.

- [ ] **Step 2: Install the dependency**

Run from `frontend/` directory:
```bash
npm install
```

Expected output: Sonner package installed, lock file updated.

- [ ] **Step 3: Verify installation**

Run:
```bash
npm ls sonner
```

Expected: Shows `sonner@1.3.0` (or newer patch version)

- [ ] **Step 4: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add sonner toast library"
```

---

## Task 2: Create Toast Helper Utility

**Files:**
- Create: `frontend/src/utils/toast.ts`

- [ ] **Step 1: Create the file**

Create `/home/thitar/dev/chore-ganizer/frontend/src/utils/toast.ts` with:

```typescript
import { toast } from 'sonner'

/**
 * Show a success toast that auto-dismisses after 5 seconds
 */
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 5000,
  })
}

/**
 * Show an error toast that requires manual dismiss
 */
export const showError = (message: string) => {
  toast.error(message, {
    duration: Infinity,
  })
}
```

- [ ] **Step 2: Verify the file exists**

Run:
```bash
ls -la /home/thitar/dev/chore-ganizer/frontend/src/utils/toast.ts
```

Expected: File exists and contains the code above.

- [ ] **Step 3: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/utils/toast.ts
git commit -m "feat: add toast helper utilities"
```

---

## Task 3: Set Up Toaster Component in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Read the current App.tsx**

Open `/home/thitar/dev/chore-ganizer/frontend/src/App.tsx` and locate the root JSX return statement.

- [ ] **Step 2: Add Sonner import**

At the top of the file with other imports, add:

```typescript
import { Toaster } from 'sonner'
```

- [ ] **Step 3: Add Toaster component**

In the JSX return, add `<Toaster />` as the first child of the root component. For example, if the return is:

```typescript
return (
  <AuthProvider>
    <BrowserRouter>
      {/* routes and content */}
    </BrowserRouter>
  </AuthProvider>
)
```

Change it to:

```typescript
return (
  <>
    <Toaster position="top-right" />
    <AuthProvider>
      <BrowserRouter>
        {/* routes and content */}
      </BrowserRouter>
    </AuthProvider>
  </>
)
```

- [ ] **Step 4: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds with no TypeScript errors related to Toaster.

- [ ] **Step 5: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/App.tsx
git commit -m "feat: add Sonner Toaster component to App"
```

---

## Task 4: Update Users.tsx

**Files:**
- Modify: `frontend/src/pages/Users.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showSuccess, showError } from '../utils/toast'
```

- [ ] **Step 2: Remove state declarations**

Find these lines (around line 16-17):
```typescript
const [successMessage, setSuccessMessage] = useState<string | null>(null)
const [errorMessage, setErrorMessage] = useState<string | null>(null)
```

Delete both lines.

- [ ] **Step 3: Update handleEditSubmit**

Find the function and replace the entire function (lines 23-40) with:

```typescript
const handleEditSubmit = async (data: CreateUserData | UpdateUserData) => {
  if (!editingUser) return
  setIsSubmitting(true)
  try {
    const result = await updateUser(editingUser.id, data as UpdateUserData)
    if (result.success) {
      showSuccess('User updated successfully')
      setEditingUser(null)
      refresh()
    } else {
      showError(result.error || 'Failed to update user')
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

Key changes:
- Removed `setSuccessMessage` call and its `setTimeout`
- Removed `setErrorMessage` calls and their `setTimeout`
- Added `showSuccess()` and `showError()` calls

- [ ] **Step 4: Update handleCreateSubmit**

Find the function (lines 42-58) and replace with:

```typescript
const handleCreateSubmit = async (data: CreateUserData | UpdateUserData) => {
  setIsSubmitting(true)
  try {
    const result = await createUser(data as CreateUserData)
    if (result.success) {
      showSuccess('User created successfully')
      setShowCreateModal(false)
      refresh()
    } else {
      showError(result.error || 'Failed to create user')
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

- [ ] **Step 5: Update handleDelete**

Find the function (lines 65-83) and replace with:

```typescript
const handleDelete = async () => {
  if (!userToDelete) return
  setIsSubmitting(true)
  try {
    const result = await deleteUser(userToDelete.id)
    if (result.success) {
      showSuccess('User deleted successfully')
      refresh()
    } else {
      showError(result.error || 'Failed to delete user')
    }
  } finally {
    setIsSubmitting(false)
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }
}
```

- [ ] **Step 6: Update handleLock**

Find the function (lines 85-98) and replace with:

```typescript
const handleLock = async (user: User) => {
  setIsSubmitting(true)
  try {
    await lockUser(user.id)
    showSuccess('User locked successfully')
    refresh()
  } catch (err: any) {
    showError(err.message || 'Failed to lock user')
  } finally {
    setIsSubmitting(false)
  }
}
```

- [ ] **Step 7: Update handleUnlock (if it exists)**

Find the `handleUnlock` function and apply the same pattern as `handleLock`.

- [ ] **Step 8: Remove rendering of messages**

Search for any JSX that renders `successMessage` or `errorMessage` and delete those sections. Look for code like:

```typescript
{successMessage && (
  <div className="...">
    {successMessage}
  </div>
)}
```

Delete those blocks.

- [ ] **Step 9: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/Users.tsx
git commit -m "refactor: migrate Users page to toast notifications"
```

---

## Task 5: Update Dashboard.tsx

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showSuccess } from '../utils/toast'
```

- [ ] **Step 2: Remove state declaration**

Find (around line 14):
```typescript
const [successMessage, setSuccessMessage] = useState<string | null>(null)
```

Delete this line.

- [ ] **Step 3: Update handleComplete**

Find the function (lines 60-68) and replace with:

```typescript
const handleComplete = async (id: number, status: 'COMPLETED' | 'PARTIALLY_COMPLETE' = 'COMPLETED') => {
  const result = await completeAssignment(id, { status })
  if (result.success) {
    const statusText = status === 'PARTIALLY_COMPLETE' ? 'partially completed' : 'completed'
    showSuccess(`Chore ${statusText}! You earned ${result.pointsAwarded} points!`)
    await loadMyAssignments()
  }
}
```

Key changes:
- Removed `setSuccessMessage()` call and its `setTimeout`
- Added `showSuccess()` call

- [ ] **Step 4: Remove rendering of message**

Search for JSX rendering `successMessage` and delete those blocks.

- [ ] **Step 5: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/Dashboard.tsx
git commit -m "refactor: migrate Dashboard page to toast notifications"
```

---

## Task 6: Update Chores.tsx

**Files:**
- Modify: `frontend/src/pages/Chores.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showSuccess } from '../utils/toast'
```

- [ ] **Step 2: Remove state declaration**

Find the line:
```typescript
const [successMessage, setSuccessMessage] = useState<string | null>(null)
```

Delete it.

- [ ] **Step 3: Find all setSuccessMessage calls**

Search for `setSuccessMessage(` in the file. There may be multiple places. For each one:
- If it sets a success message: replace `setSuccessMessage('message')` with `showSuccess('message')`
- If it clears with `setSuccessMessage(null)` or in a `setTimeout`, delete the entire line/statement

Example:
```typescript
// Before:
setSuccessMessage('Chore completed!')
setTimeout(() => setSuccessMessage(null), 5000)

// After:
showSuccess('Chore completed!')
```

- [ ] **Step 4: Remove rendering of message**

Search for JSX that renders `successMessage` and delete those blocks.

- [ ] **Step 5: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/Chores.tsx
git commit -m "refactor: migrate Chores page to toast notifications"
```

---

## Task 7: Update Profile.tsx

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showSuccess, showError } from '../utils/toast'
```

- [ ] **Step 2: Remove state declarations**

Find and delete these lines:
```typescript
const [success, setSuccess] = useState<string | null>(null)
const [error, setError] = useState<string | null>(null)
```

- [ ] **Step 3: Find and replace all success/error message calls**

Search the file for:
- `setSuccess('...')` → replace with `showSuccess('...')`
- `setError('...')` → replace with `showError('...')`
- `setTimeout(() => set[Success|Error](null), ...)` → delete entire line

- [ ] **Step 4: Remove rendering of messages**

Delete any JSX blocks that render `success` or `error` state.

- [ ] **Step 5: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/Profile.tsx
git commit -m "refactor: migrate Profile page to toast notifications"
```

---

## Task 8: Update PocketMoney.tsx

**Files:**
- Modify: `frontend/src/pages/PocketMoney.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showError } from '../utils/toast'
```

- [ ] **Step 2: Find error state and rendering**

Search for error state handling. PocketMoney likely has inline error rendering. Find the JSX that displays the error and note where it's rendered (e.g., an ErrorDisplay component or a div).

- [ ] **Step 3: Identify error scenarios**

Look for places where errors are set. Common patterns:
```typescript
setError('Failed to load pocket money data')
```

Replace these with:
```typescript
showError('Failed to load pocket money data')
```

- [ ] **Step 4: Remove error state if it's only used for display**

If the `error` state is ONLY used to display a message (not to control other logic), you can remove it. If it's used for logic (like showing/hiding a section), keep the state but remove the error display JSX.

Check: if removing the error state breaks anything, keep it.

- [ ] **Step 5: Remove error rendering JSX**

Delete any `<div>`, `<ErrorDisplay>`, or conditional blocks that display the `error` state, but KEEP any error state variable used for logic.

- [ ] **Step 6: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/PocketMoney.tsx
git commit -m "refactor: migrate PocketMoney page to toast notifications"
```

---

## Task 9: Update Login.tsx

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Add import**

At the top, add:

```typescript
import { showError, showSuccess } from '../utils/toast'
```

- [ ] **Step 2: Remove success state**

Find:
```typescript
const [success, setSuccess] = useState('')
```

Delete it.

- [ ] **Step 3: Replace success message display**

Search for where `setSuccess(...)` is called (around line 79). Replace:

```typescript
setSuccess('Registration successful! You can now log in.')
```

with:

```typescript
showSuccess('Registration successful! You can now log in.')
```

- [ ] **Step 4: Handle general form errors**

Find where `errors.general` is set (around line 74):
```typescript
if (!result.success) {
  setErrors({ general: result.error || 'Login failed' })
}
```

Replace with:

```typescript
if (!result.success) {
  showError(result.error || 'Login failed')
}
```

- [ ] **Step 5: Remove success message rendering**

Search for JSX that displays `success` state and delete it. Example:
```typescript
{success && <div className="...green...">{success}</div>}
```

Delete such blocks.

- [ ] **Step 6: Keep field-specific errors inline**

Do NOT touch the field-specific error rendering (errors.email, errors.password, errors.name). Those should remain inline below their form fields per the spec.

- [ ] **Step 7: Verify syntax**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/pages/Login.tsx
git commit -m "refactor: migrate Login page to toast notifications"
```

---

## Task 10: Manual Testing

**Manual verification (no automated test file)**

- [ ] **Step 1: Start the app**

From root directory:
```bash
docker compose up --build -d
```

Wait for containers to be ready:
```bash
docker compose logs -f frontend
```

When you see "starting nginx" or similar, the frontend is ready. Navigate to `http://localhost:3002`.

- [ ] **Step 2: Test Users page success message**

1. Go to Users page
2. Click "Edit" on any user
3. Change any field (e.g., name)
4. Click Save
5. Verify: Green success toast appears in top-right, auto-dismisses after 5 seconds
6. Verify: No layout shift occurred
7. Click the ✕ button on another toast to verify manual dismiss works

- [ ] **Step 3: Test Users page error message**

1. In Users page, try to create a user with duplicate email (use existing parent email)
2. Verify: Red error toast appears and stays visible (doesn't auto-dismiss)
3. Verify: Can manually close it with ✕ button

- [ ] **Step 4: Test Dashboard page**

1. Go to Dashboard
2. Complete a pending chore (mark as Done)
3. Verify: Success toast appears with points earned message
4. Verify: Auto-dismisses after 5 seconds

- [ ] **Step 5: Test Chores page**

1. Navigate to Chores page
2. Complete a chore
3. Verify: Success toast appears and auto-dismisses

- [ ] **Step 6: Test Profile page**

1. Go to Profile
2. Change notification settings (toggle any setting)
3. Save
4. Verify: Success toast appears

- [ ] **Step 7: Test Login page**

1. Logout first (if logged in)
2. Try to login with wrong password
3. Verify: Red error toast appears (general form error)
4. Verify: Field-level validation errors still appear INLINE below the email/password fields (not as toasts)
5. Clear the error toast and try again with correct credentials
6. Verify: After successful login, redirected to dashboard (no success toast shown on Login page, which is expected)

- [ ] **Step 8: Test multiple toasts**

1. On Users page, trigger multiple errors quickly
2. Verify: Toasts stack vertically in top-right
3. Verify: No layout shift as toasts appear/disappear

- [ ] **Step 9: Test PocketMoney page**

1. Go to Pocket Money page
2. If there's error handling, trigger an error scenario if possible
3. Verify: Error displays as toast, not inline

- [ ] **Step 10: Stop the app**

```bash
docker compose down
```

- [ ] **Step 11: Commit test verification**

No code changes in this step, but document that manual testing passed:

```bash
cd /home/thitar/dev/chore-ganizer
git log --oneline -10
# Verify all 9 commits from previous tasks are there
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 6 pages (Users, Dashboard, Chores, Profile, PocketMoney, Login) updated
- [x] **Success behavior**: Auto-dismiss 5s, manual dismiss available
- [x] **Error behavior**: Manual dismiss only, no auto-dismiss
- [x] **Toast helper**: Created for consistency
- [x] **App setup**: Toaster component in place
- [x] **Login special case**: Field errors remain inline, form-level errors as toasts
- [x] **No placeholder steps**: All code shown, all commands exact
- [x] **Commits frequent**: One commit per file/task
- [x] **TDD**: Manual testing covers all scenarios

---

## Next Steps After Implementation

1. If all manual tests pass, consider running automated browser tests via Playwright if available
2. No additional documentation needed — changes are self-evident from code
3. The toast system is now ready for future extensions (info, warning, loading toasts)
