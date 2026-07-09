import express from 'express'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import routes from './routes/index'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { csrfProtection } from './middleware/csrf'

const app = express()

// Trust proxy for production (behind reverse proxy)
app.set('trust proxy', 1)

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// Session configuration
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set when NODE_ENV=production — refusing to start with the dev fallback secret')
}
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret'
const raw = Number(process.env.SESSION_MAX_AGE)
const sessionMaxAge = (!process.env.SESSION_MAX_AGE || isNaN(raw) || raw <= 0) ? 604800000 : raw

const rawSameSite = process.env.SAMESITE_POLICY || 'strict'
const validSameSite = ['strict', 'lax', 'none']
const sameSitePolicy = (validSameSite.includes(rawSameSite) ? rawSameSite : 'strict') as 'strict' | 'lax' | 'none'

const isProduction = process.env.NODE_ENV === 'production'
const isSecureCookie = isProduction && process.env.SECURE_COOKIES !== 'false'

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: sameSitePolicy,
    path: '/',
  },
}))

// CSRF protection (double-submit cookie pattern)
app.use('/api', csrfProtection)

// API routes
app.use('/api', routes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export { app }
export default app
