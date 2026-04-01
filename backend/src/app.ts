import express, { RequestHandler } from 'express'
import cors from 'cors'
import session from 'express-session'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { csrfMiddleware, getCsrfToken } from './middleware/csrf.js'
import { requestLogger } from './middleware/requestLogger.js'
import { metricsMiddleware } from './middleware/metricsMiddleware.js'
import { shutdownMiddleware } from './middleware/shutdownMiddleware.js'
import { compressionMiddleware } from './middleware/compression.js'
import { requestTimerMiddleware } from './middleware/requestTimer.js'
import metricsRoutes from './routes/metrics.routes.js'
import { FULL_VERSION } from './version.js'
import { logger } from './utils/logger.js'

// Load environment variables
dotenv.config()

// Log server startup banner
logger.info(`Chore-Ganizer API Server - Version: ${FULL_VERSION}`)

const app = express()

// Trust proxy for production (behind reverse proxy)
app.set('trust proxy', 1)

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

// Rate limiting - General API limiter
// Disabled in staging for local testing
const noOpMiddleware: RequestHandler = (_req, _res, next) => next();

const generalLimiter = process.env.DISABLE_RATE_LIMIT === 'true'
  ? noOpMiddleware
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per window
      message: {
        success: false,
        error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' }
      },
      standardHeaders: true,
      legacyHeaders: false,
    })

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter)

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}))

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Response compression middleware - reduces API response sizes by 50%+
app.use(compressionMiddleware)

// Request timing middleware - logs slow requests (>1s) for performance monitoring
app.use(requestTimerMiddleware)

// Shutdown middleware - tracks in-flight requests and rejects new requests during shutdown
app.use(shutdownMiddleware)

// Session configuration
// Generate a secure random secret if not provided - DO NOT use in production
const getSessionSecret = (): string => {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be set in production')
  }
  // In development, generate a random secret (note: sessions won't persist across restarts)
  return crypto.randomBytes(64).toString('hex')
}

const sessionSecret = getSessionSecret()
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE) || 604800000 // 7 days
const sameSitePolicy = (process.env.SAMESITE_POLICY || 'strict') as 'strict' | 'lax' | 'none' // 'strict', 'lax', or 'none'

// Check if we're behind a trusted proxy
const isProduction = process.env.NODE_ENV === 'production'
const isSecureCookie = isProduction && process.env.SECURE_COOKIES !== 'false'

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,  // Don't create empty sessions
  rolling: true,  // Reset session age on each request
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: sameSitePolicy,  // Configurable via SAMESITE_POLICY env var
    path: '/',
  },
}))

// CSRF protection middleware
app.use(csrfMiddleware)

// Request logging middleware
app.use(requestLogger)

// Metrics middleware
app.use(metricsMiddleware)

// CSRF token endpoint - must be before routes
app.get('/api/csrf-token', getCsrfToken)

// API routes
app.use('/api', routes)

// Metrics routes
app.use('/api', metricsRoutes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export default app
