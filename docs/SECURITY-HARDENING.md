# Security Hardening Guide for Reverse Proxy Deployment

This document outlines security hardening measures for deploying Chore-Ganizer behind a reverse proxy (Caddy).

## Current Security Status

### Already Implemented
- Session-based authentication with [`express-session`](../backend/src/app.ts)
- CORS configuration with credentials support
- Trust proxy setting enabled (`app.set('trust proxy', 1)`)
- Secure cookies in production (when `SECURE_COOKIES=true`)
- `httpOnly` cookies enabled (prevents XSS access to cookies)
- `sameSite: 'lax'` (partial CSRF protection)
- Role-based access control (PARENT/CHILD roles)

### Missing Security Measures
- No Helmet middleware (missing security headers)
- No rate limiting (vulnerable to brute force)
- No CSRF token protection
- No request size limits
- No input validation middleware
- Default session secret is insecure

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

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `SESSION_SECRET` (32+ random characters)
- [ ] Set `CORS_ORIGIN` to your actual domain
- [ ] Set `SECURE_COOKIES=true`
- [ ] Install and configure Helmet middleware
- [ ] Install and configure rate limiting
- [ ] Add request size limits
- [ ] Change `sameSite` to `'strict'`
- [ ] Change `saveUninitialized` to `false`
- [ ] Add input validation on auth routes
- [ ] Remove console.log statements in production frontend
- [ ] Build frontend with production settings
- [ ] Configure Caddy security headers
- [ ] Test HTTPS and cookie security
- [ ] Test rate limiting works
- [ ] Test session expires correctly

## Quick Implementation Priority

### High Priority (Do First)
1. Set environment variables (SESSION_SECRET, CORS_ORIGIN, SECURE_COOKIES)
2. Add Helmet middleware
3. Add rate limiting on auth endpoints
4. Add request size limits

### Medium Priority
1. Add input validation
2. Improve session configuration
3. Remove dev logging from frontend

### Low Priority
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