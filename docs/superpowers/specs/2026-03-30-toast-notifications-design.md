# Toast Notifications System Design

**Date:** 2026-03-30
**Status:** Design
**Goal:** Replace all inline success/error messages with fixed-position toast notifications to prevent layout shift

---

## Problem Statement

Currently, all success and error messages are rendered as inline `<div>` elements managed via `useState` and `setTimeout`. This causes layout shift — the page content moves down when a message appears, then back up when it disappears. This affects user experience and looks janky.

## Solution Overview

Replace the entire notification system with **Sonner**, a lightweight toast library. Move all messages from inline state to fixed-position toasts in the top-right corner (no layout shift). Standardize notification patterns across 6+ pages.

---

## Architecture

### Technology: Sonner
- **Library:** `sonner` (npm)
- **Size:** ~4KB
- **Reason:** Zero-config, excellent defaults, no layout impact, widely used
- **Documentation:** https://sonner.emilkowal.ski/

### Component Placement
```
App.tsx
  └── <Toaster /> (fixed overlay, top-right corner)
      ↑ renders all toasts globally
      ↑ triggered by toast.success() / toast.error() calls anywhere
```

### Toast Behavior

| Type | Auto-dismiss | Manual Dismiss | Duration | Use Case |
|------|-------------|---|----------|----------|
| **Success** | ✓ | ✓ (✕ button) | 5 seconds | Chore completed, user updated, settings saved |
| **Error** | ✗ | ✓ (✕ button) | Persistent | API failures, validation errors, permission denied |
| **Info/Warning** | Future | Future | N/A | Not implemented yet; added later if needed |

### Helper Functions (Optional)

Create `frontend/src/utils/toast.ts`:
```typescript
import { toast } from 'sonner'

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 5000,
  })
}

export const showError = (message: string) => {
  toast.error(message, {
    duration: Infinity, // manual dismiss only
  })
}
```

Optional but recommended for consistency and easier future changes to toast styling/duration.

---

## Files to Modify

### New Dependency
- `frontend/package.json` — add `sonner`

### Core Setup
- `frontend/src/App.tsx` — add `<Toaster />` component

### Pages with Inline Notifications (remove state, add toast calls)
1. `frontend/src/pages/Users.tsx`
   - Remove: `successMessage`, `errorMessage` state
   - Remove: `setTimeout` cleanup logic
   - Replace: `setSuccessMessage(...)` → `toast.success(...)`
   - Replace: `setErrorMessage(...)` → `toast.error(...)`

2. `frontend/src/pages/Dashboard.tsx`
   - Same pattern as Users.tsx

3. `frontend/src/pages/Chores.tsx`
   - Same pattern

4. `frontend/src/pages/Profile.tsx`
   - Same pattern

5. `frontend/src/pages/PocketMoney.tsx`
   - Same pattern

6. `frontend/src/pages/Login.tsx`
   - Replace form-level error display with `toast.error(...)`
   - Keep field-specific validation errors inline (not in toasts)

### Optional Helper File
- `frontend/src/utils/toast.ts` — wrapper functions for consistency

---

## Data Flow

### Before (Current)
```
User updates color
  → API call succeeds
  → setSuccessMessage("Color updated!")
  → setTimeout(..., 5000) to clear
  → Renders inline <div> → layout shift ↓
  → After 5s, div removed → layout shift ↑
```

### After (With Sonner)
```
User updates color
  → API call succeeds
  → toast.success("Color updated!")
  → Toast rendered in fixed overlay (no layout shift)
  → Auto-dismisses after 5s or manual close
  → No layout impact
```

---

## Implementation Steps

1. **Install dependency** — `npm install sonner`
2. **Set up root** — add `<Toaster />` to `App.tsx`
3. **Create helper** (optional) — `frontend/src/utils/toast.ts`
4. **Replace on each page** — remove state, add toast calls
5. **Test all flows** — success, error, multiple toasts, manual dismiss

---

## Testing Checklist

- [ ] Success message displays and auto-dismisses after 5s
- [ ] Success message can be manually closed
- [ ] Error message displays and only closes on manual dismiss
- [ ] Multiple toasts stack vertically
- [ ] Toast doesn't cause layout shift
- [ ] All 6 pages work correctly
- [ ] Form validation errors (Login) still display inline where appropriate

---

## Future Extensibility

Adding new toast types (info, warning, loading) is trivial:
```typescript
toast.info("Information message")
toast.warning("Warning message")
const id = toast.loading("Processing...")
toast.success("Done!", { id }) // replace loading toast
```

No architectural changes needed — `sonner` handles all of this.

---

## Scope Out (Not Included)

- Notification Bell component (persistent backend notifications) — unchanged
- ErrorDisplay component (inline error UI) — unchanged (not a toast)
- Form validation errors (e.g., Login password requirements) — remain inline below fields
