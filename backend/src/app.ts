import express from 'express'
import cors from 'cors'
import session from 'express-session'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import SQLiteStore from 'connect-sqlite3'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { csrfMiddleware, getCsrfToken } from './middleware/csrf.js'
import { FULL_VERSION } from './version.js'

// Load environment variables
dotenv.config()

// Log server startup banner
console.log(`
╔═══════════════════════════════════════╗
║     Chore-Ganizer API Server          ║
║     Version: ${FULL_VERSION}            ║
╚═══════════════════════════════════════╝
`)

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

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-not-secure'
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE) || 604800000 // 7 days

// Check if we're behind a trusted proxy
const isProduction = process.env.NODE_ENV === 'production'
const isSecureCookie = isProduction && process.env.SECURE_COOKIES !== 'false'

// Warn if using default secret in production
if (isProduction && sessionSecret === 'dev-secret-not-secure') {
  console.warn('WARNING: Using default SESSION_SECRET in production! Set a secure secret.')
}

// Create SQLite session store
const SQLiteStoreFactory = SQLiteStore(session)
const sessionStore = new SQLiteStoreFactory({
  db: 'sessions.db',
  dir: './data',
  table: 'sessions',
})

app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,  // Don't create empty sessions
  rolling: true,  // Reset session age on each request
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: 'strict',  // Strict provides better CSRF protection
    path: '/',
  },
}))

// CSRF protection middleware
app.use(csrfMiddleware)

// CSRF token endpoint - must be before routes
app.get('/api/csrf-token', getCsrfToken)

// API routes
app.use('/api', routes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export default app
