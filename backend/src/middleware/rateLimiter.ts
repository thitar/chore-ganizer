import rateLimit from 'express-rate-limit'

// Skip in tests, same convention as csrf.ts — Jest's supertest suites hit
// these routes directly against the real app and shouldn't be throttled.
const skipInTest = () => process.env.NODE_ENV === 'test'

// Thresholds are configurable (defaulting to the production values below) so
// a full e2e suite run — which legitimately makes far more API calls than a
// single family ever would in 15 minutes — can raise them without changing
// production behavior. See docs/UAT-CHECKLIST.md / e2e/README for the env
// vars a full Playwright run sets.
const generalMax = Number(process.env.RATE_LIMIT_MAX) || 300
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: generalMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
})

// Stricter limit on login specifically — account lockout is out of scope
// (private-network homelab), so this is the substitute defense against
// brute-force credential guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    data: null,
    error: { message: 'Too many login attempts, please try again later' },
  },
})
