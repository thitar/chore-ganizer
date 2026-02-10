import express from 'express'
import cors from 'cors'
import session from 'express-session'
import dotenv from 'dotenv'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

// Load environment variables
dotenv.config()

const app = express()

// Trust proxy for production (behind nginx)
app.set('trust proxy', 1)

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}))

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-not-secure'
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE) || 604800000 // 7 days

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: 'lax',
  },
}))

// API routes
app.use('/api', routes)

// 404 handler
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

export default app
