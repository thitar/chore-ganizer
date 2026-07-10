import rateLimit from 'express-rate-limit'

// Skip in tests, same convention as csrf.ts — Jest's supertest suites hit
// these routes directly against the real app and shouldn't be throttled.
const skipInTest = () => process.env.NODE_ENV === 'test'

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
})

// Stricter limit on login specifically — account lockout is out of scope
// (private-network homelab), so this is the substitute defense against
// brute-force credential guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    data: null,
    error: { message: 'Too many login attempts, please try again later' },
  },
})
