# Bug Fixes Log

This document tracks bug fixes applied to the Chore-Ganizer application.

---

## Session Authentication Fixes (2026-02-12)

### Issue: Login button not working - No session cookie being set

**Symptoms:**
- Clicking "Sign In" button appeared to do nothing
- Login API returned 200 OK but no Set-Cookie header was sent
- Subsequent requests to `/api/auth/me` returned 401 Unauthorized

**Root Causes & Fixes:**

#### 1. SECURE_COOKIES not passed to Docker container

**File:** `docker-compose.yml`

**Problem:** The `SECURE_COOKIES` environment variable was defined in `.env` but not passed through to the backend container. This caused the session cookie to be created with `secure: true`, which browsers reject over HTTP connections.

**Fix:** Added `SECURE_COOKIES` to the backend environment variables:
```yaml
environment:
  - SECURE_COOKIES=${SECURE_COOKIES:-false}
```

#### 2. Auth state not shared between components

**File:** `frontend/src/hooks/useAuth.tsx` (renamed from `.ts`)

**Problem:** Each component calling `useAuth()` had its own separate state instance. When `Login.tsx` set the user after successful login, `App.tsx` didn't know about it and continued showing the login form.

**Fix:** Converted `useAuth` from a simple hook to a React Context:
- Created `AuthContext` and `AuthProvider` 
- Wrapped the app in `AuthProvider` so all components share the same auth state
- Exported both `useAuth` and `AuthProvider` from the hook

#### 3. Updated App.tsx to use AuthProvider

**File:** `frontend/src/App.tsx`

**Fix:** 
- Renamed the main component to `AppContent`
- Created new `App` component that wraps `AppContent` in `AuthProvider`

---

## UI Fixes (2026-02-12)

### Issue: Incorrect demo credentials displayed

**File:** `frontend/src/pages/Login.tsx`

**Problem:** Login page showed outdated demo credentials that didn't match the actual seeded users.

**Fix:** Removed the demo credentials section entirely from the login form.

---

## Configuration Files Modified

1. `docker-compose.yml` - Added SECURE_COOKIES environment variable
2. `.env` - Added SECURE_COOKIES=false
3. `frontend/src/hooks/useAuth.ts` → `useAuth.tsx` - Converted to React Context
4. `frontend/src/hooks/index.ts` - Export AuthProvider
5. `frontend/src/App.tsx` - Wrap in AuthProvider
6. `frontend/src/pages/Login.tsx` - Remove demo credentials
