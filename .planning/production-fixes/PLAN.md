# Production Issues Fix Plan

## Issue 1: config.js 403 Forbidden — login broken

**Root cause (confirmed in production):** `docker-entrypoint.sh` writes `config.js` as root with permissions `-rw-r-----` (640). nginx runs as the `nginx` user (uid 101, NOT in root group) and cannot read the file → nginx returns 403 Forbidden.

Verified on production server (`chore.thitar.ovh`):
```
$ curl -sI https://chore.thitar.ovh/config.js
HTTP/2 403
content-type: text/html    ← nosniff blocks this as JS

$ docker exec chore-ganizer-frontend ls -la /usr/share/nginx/html/config.js
-rw-r----- 1 root root 77 Jul 18 21:03 config.js   ← nginx user can't read
```

The nginx config itself is correct (`location = /config.js` with `try_files $uri =404`). The file exists and has valid content. The only problem is file permissions.

**Fix:** Add `chmod 644` to `docker-entrypoint.sh` after writing config.js.

**File to modify:**
- `frontend/docker-entrypoint.sh` — add `chmod 644 /usr/share/nginx/html/config.js` after the `cat > ...` block

---

## Issue 2: No "retype password" when creating users

**Root cause:** `UsersPage.tsx` has a single password input (line 136). The ProfilePage change-password form already has a confirm field but the user creation form does not.

**Fix:** Add a "Confirm password" field to the user creation form with client-side validation.

**Files to modify:**
- `frontend/src/pages/UsersPage.tsx` — add `confirmPassword` state, input field, and mismatch validation in `handleSubmit`

---

## Issue 3: Password recovery from login page (email-based)

**Root cause:** No forgot-password flow exists. If a user forgets their password, they're stuck until a parent deletes and recreates the account.

**Fix:** Standard email-based password reset flow:

### Backend

1. **Prisma schema** — add two fields to `User` model:
   - `resetToken String?` (unique, indexed)
   - `resetTokenExpiry DateTime?`

2. **SMTP config** — add `backend/src/config/smtp.ts`:
   - Read env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - Export `isSmtpConfigured` boolean and `getSmtpConfig()` function
   - Add nodemailer as a dependency
   - Gmail defaults (for `.env.example`): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_FROM=<same as SMTP_USER>`

3. **Auth service** — add two functions to `auth.service.ts`:
   - `forgotPassword(email)` — looks up user by email, generates a random token (32 bytes hex, 1-hour expiry), stores hash in DB, sends email with reset link (`${FRONTEND_URL}/reset-password?token=...`). Always returns success message regardless of whether email exists (prevent enumeration).
   - `resetPassword(token, newPassword)` — validates token + expiry, hashes new password, clears token fields, returns success.

4. **Auth routes** — add two routes to `auth.routes.ts`:
   - `POST /api/auth/forgot-password` — public, rate-limited, calls `forgotPassword()`
   - `POST /api/auth/reset-password` — public, rate-limited, validates token + new password, calls `resetPassword()`

5. **Auth schema** — add to `auth.schema.ts`:
   - `forgotPasswordSchema` — `{ email: z.string().email() }`
   - `resetPasswordSchema` — `{ token: z.string().min(1), newPassword: z.string().min(6) }`

6. **Env vars** — add to `.env.example` and `docker-compose.yml`:
   - `SMTP_HOST` — e.g. `smtp.gmail.com`
   - `SMTP_PORT` — e.g. `465` (SSL) or `587` (STARTTLS)
   - `SMTP_USER` — full Gmail address (e.g. `you@gmail.com`)
   - `SMTP_PASS` — Gmail App Password (16 chars, NOT your regular password; generate at https://myaccount.google.com/apppasswords with 2FA enabled)
   - `SMTP_FROM` — typically same as `SMTP_USER`
   - `FRONTEND_URL` — e.g. `https://chore.thitar.ovh` (for building the reset link in emails)
   - Graceful degradation: if SMTP vars are empty, password recovery is disabled and the "Forgot password?" link is hidden

### Frontend

7. **Auth API** — add to `auth.api.ts`:
   - `forgotPassword(email)` — POST `/api/auth/forgot-password`
   - `resetPassword(token, password)` — POST `/api/auth/reset-password`

8. **ForgotPasswordPage** — new page at `/forgot-password`:
   - Simple form: email input + submit
   - Shows "If an account exists with that email, you'll receive a reset link" (always, whether email exists or not)

9. **ResetPasswordPage** — new page at `/reset-password`:
   - Reads `token` from URL query params
   - Form: new password + confirm password fields
   - On success, shows "Password reset! You can now sign in" with link to login
   - On invalid/expired token, shows error with link to try again

10. **LoginPage** — add "Forgot password?" link below the form pointing to `/forgot-password`

11. **App.tsx** — add routes for `/forgot-password` and `/reset-password` (public, no auth required)

### Password hashing in emails
The reset link contains a raw random token (not a bcrypt hash). The token is stored hashed in the DB (SHA-256) to prevent DB leak from leaking valid tokens. The raw token is only in the email link and is single-use (cleared on successful reset).

**Files to modify:**
- `backend/package.json` — add nodemailer dependency
- `backend/prisma/schema.prisma` — add resetToken fields to User
- `backend/src/config/smtp.ts` — new file, SMTP config
- `backend/src/services/auth.service.ts` — forgotPassword + resetPassword functions
- `backend/src/routes/auth.routes.ts` — two new routes
- `backend/src/schemas/auth.schema.ts` — two new schemas
- `backend/.env.example` — add SMTP env vars
- `.env.example` — add SMTP + FRONTEND_URL env vars
- `docker-compose.yml` — add SMTP env vars to backend service
- `frontend/src/api/auth.api.ts` — two new API calls
- `frontend/src/pages/ForgotPasswordPage.tsx` — new page
- `frontend/src/pages/ResetPasswordPage.tsx` — new page
- `frontend/src/pages/LoginPage.tsx` — add forgot password link
- `frontend/src/App.tsx` — add two new routes

---

## Execution Order

1. **Issue 1 (config.js nginx fix)** — blocks all login, highest priority
2. **Issue 2 (retype password)** — quick win, small change
3. **Issue 3 (email password recovery)** — largest feature, independent of the others

Each issue on its own branch with a separate PR.
