# Security Hardening Guide for Reverse Proxy Deployment

This document outlines security hardening measures for deploying Chore-Ganizer behind a reverse proxy (Caddy).

## Current Security Status

### Already Implemented
- ✅ Session-based authentication with [`express-session`](../backend/src/app.ts)
- ✅ CORS configuration with credentials support
- ✅ Trust proxy setting enabled (`app.set('trust proxy', 1)`)
- ✅ Secure cookies in production (when `SECURE_COOKIES=true`)
- ✅ `httpOnly` cookies enabled (prevents XSS access to cookies)
- ✅ `sameSite: 'strict'` (full CSRF protection) - **Phase 6**
- ✅ Role-based access control (PARENT/CHILD roles)
- ✅ **Helmet middleware** - Security headers including CSP (implemented in [`app.ts`](../backend/src/app.ts))
- ✅ **Rate limiting** - General and auth-specific rate limiting (implemented in [`rateLimiter.ts`](../backend/src/middleware/rateLimiter.ts))
- ✅ **SQLite session store** - Persistent sessions across restarts (implemented in [`app.ts`](../backend/src/app.ts))
- ✅ **Request size limits** - 10kb limit on request body (implemented in [`app.ts`](../backend/src/app.ts))
- ✅ `saveUninitialized: false` - Don't create empty sessions
- ✅ `rolling: true` - Session refresh on each request
- ✅ **Reverse Proxy (Caddy)** - HTTPS with Let's Encrypt, security headers
- ✅ **Debug logging disabled** - `VITE_DEBUG=false` in production
- ✅ **CSRF Protection** - Token generation and validation - **Phase 6** (implemented in [`auth.routes.ts`](../backend/src/routes/auth.routes.ts))
- ✅ **Input Validation Middleware** - Zod schemas for all API endpoints - **Phase 6** (implemented in [`validation.schemas.ts`](../backend/src/schemas/validation.schemas.ts) and [`validator.ts`](../backend/src/middleware/validator.ts))
- ✅ **Password Policy Enforcement** - 8+ chars, uppercase, lowercase, number, special char - **Phase 6**
- ✅ **Password Strength Indicator** - Visual feedback on registration form - **Phase 6** (implemented in [`PasswordStrengthIndicator.tsx`](../frontend/src/components/common/PasswordStrengthIndicator.tsx))

### All Security Measures Implemented ✅

## Required Environment Variables

Create a `.env` file in the backend directory with these values:

```env
# Production mode
NODE_ENV=production

# MUST change this to a strong random string
SESSION_SECRET=your-super-secret-random-string-at-least-32-chars

# Your domain for CORS
CORS_ORIGIN=https://chore.thitar.ovh

# Enable secure cookies for HTTPS
SECURE_COOKIES=true

# Session max age in milliseconds (7 days default)
SESSION_MAX_AGE=604800000
```

## Recommended Caddyfile Configuration

Your Caddyfile is good, but consider these enhancements:

```caddyfile
chore.thitar.ovh {
    # Block sensitive files
    @blocked {
        path *.env *.git* *.DS_Store *.md *.json *.ts *.tsx *.js
    }
    respond @blocked "Access denied" 403

    # Security headers
    header {
        # Prevent clickjacking
        X-Frame-Options "DENY"
        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        # XSS protection
        X-XSS-Protection "1; mode=block"
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
        # Content Security Policy - adjust as needed
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
        # HSTS (HTTP Strict Transport Security)
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }

    reverse_proxy chore.docker.lab:3002 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

## Backend Security Improvements

### 1. Add Helmet Middleware

Install helmet:
```bash
cd backend
npm install helmet
```

Update [`app.ts`](../backend/src/app.ts):
```typescript
import helmet from 'helmet'

// Add after express initialization
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
```

### 2. Add Rate Limiting

Install rate-limiter:
```bash
npm install express-rate-limit
```

Add to [`app.ts`](../backend/src/app.ts):
```typescript
import rateLimit from 'express-rate-limit'

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' }
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per window
  message: {
    success: false,
    error: { message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' }
  },
})

app.use('/api', generalLimiter)
// Apply authLimiter to login route specifically
```

### 3. Add Request Size Limits

The current body parser has no explicit size limit. Update:

```typescript
// Limit request body size
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
```

### 4. Improve Session Configuration

Update session configuration in [`app.ts`](../backend/src/app.ts):

```typescript
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,  // Changed from true - don't create empty sessions
  rolling: true,  // Reset session age on each request
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: 'strict',  // Changed from 'lax' for better CSRF protection
    path: '/',
    // No domain set - defaults to current domain
  },
}))
```

### 5. Add Input Validation

Install validation libraries:
```bash
npm install express-validator
```

Create validation middleware for routes:

```typescript
import { body, validationResult } from 'express-validator'

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid input', code: 'VALIDATION_ERROR', details: errors.array() }
      })
    }
    next()
  }
]
```

## Frontend Security Improvements

### 1. Remove Console Logging in Production

Update [`client.ts`](../frontend/src/api/client.ts) to disable logging in production:

```typescript
const isDev = import.meta.env.DEV

// Request interceptor
this.client.interceptors.request.use(
  (config) => {
    if (isDev) {
      console.log('[ApiClient] Request:', config.method?.toUpperCase(), config.url)
    }
    return config
  },
  // ...
)
```

### 2. Build for Production

Create production build with correct environment:

```bash
cd frontend
VITE_API_URL="" npm run build
```

The built files will be in `frontend/dist/` and should be served by your backend or a static file server.

## Docker Security

If running in Docker, ensure:

1. **Run as non-root user**:
```dockerfile
USER node
```

2. **Use multi-stage build** to reduce attack surface

3. **Don't expose unnecessary ports**

4. **Use Docker secrets for sensitive data**

## Checklist for Production Deployment

- [x] Set `NODE_ENV=production`
- [x] Generate strong `SESSION_SECRET` (32+ random characters)
- [x] Set `CORS_ORIGIN` to your actual domain
- [x] Set `SECURE_COOKIES=true`
- [x] Install and configure Helmet middleware ✅
- [x] Install and configure rate limiting ✅
- [x] Add request size limits (10kb) ✅
- [x] Configure SQLite session store ✅
- [x] Set `saveUninitialized` to `false` ✅
- [x] Set `rolling: true` for session refresh ✅
- [x] Configure reverse proxy (Caddy) with HTTPS ✅
- [x] Disable debug logging in production frontend (`VITE_DEBUG=false`) ✅
- [x] Change `sameSite` to `'strict'` ✅ **Phase 6**
- [x] Add input validation on all API routes ✅ **Phase 6**
- [x] Add CSRF token protection ✅ **Phase 6**
- [x] Add password policy enforcement ✅ **Phase 6**

## Quick Implementation Priority

### All Security Measures Completed ✅

#### Phase 1-5 (Previously Completed)
1. ✅ Add Helmet middleware
2. ✅ Add rate limiting on auth endpoints
3. ✅ Add request size limits (10kb)
4. ✅ Configure SQLite session store
5. ✅ Set `saveUninitialized: false`
6. ✅ Set `rolling: true` for session refresh
7. ✅ Configure reverse proxy (Caddy) with HTTPS
8. ✅ Set environment variables (SESSION_SECRET, CORS_ORIGIN, SECURE_COOKIES)
9. ✅ Disable debug logging in production frontend

#### Phase 6 (Recently Completed)
1. ✅ Change `sameSite` to `'strict'`
2. ✅ Add CSRF token protection (`/api/csrf-token` endpoint)
3. ✅ Add input validation middleware with Zod schemas
4. ✅ Add password policy enforcement (8+ chars, uppercase, lowercase, number, special char)
5. ✅ Add password strength indicator on registration form

### Optional Future Enhancements
1. Fine-tune CSP headers
2. Add request logging for audit
3. Add IP-based blocking for repeated offenses

## Testing Security

After implementing changes, test:

1. **HTTPS**: Verify site only accessible via HTTPS
2. **Cookies**: Check cookies have `Secure` and `HttpOnly` flags
3. **Rate Limiting**: Try logging in 6 times rapidly
4. **Headers**: Use browser dev tools to check response headers
5. **Session**: Verify session expires after inactivity
6. **CORS**: Verify API rejects requests from other origins