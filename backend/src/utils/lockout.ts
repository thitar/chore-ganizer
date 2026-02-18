import prisma from '../config/database.js'

// Get configuration from environment
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10)
const ACCOUNT_LOCKOUT_MINUTES = parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES || '15', 10)

export interface LockoutStatus {
  isLocked: boolean
  lockedAt: Date | null
  lockoutUntil: Date | null
  failedLoginAttempts: number
  remainingLockoutSeconds: number | null
}

/**
 * Check if a user account is currently locked
 */
export const isLocked = async (userId: number): Promise<LockoutStatus> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  if (!user) {
    return {
      isLocked: false,
      lockedAt: null,
      lockoutUntil: null,
      failedLoginAttempts: 0,
      remainingLockoutSeconds: null,
    }
  }

  const now = new Date()
  const isCurrentlyLocked = user.lockoutUntil !== null && user.lockoutUntil > now

  let remainingLockoutSeconds: number | null = null
  if (isCurrentlyLocked && user.lockoutUntil) {
    remainingLockoutSeconds = Math.max(0, Math.floor((user.lockoutUntil.getTime() - now.getTime()) / 1000))
  }

  return {
    isLocked: isCurrentlyLocked,
    lockedAt: user.lockedAt,
    lockoutUntil: user.lockoutUntil,
    failedLoginAttempts: user.failedLoginAttempts,
    remainingLockoutSeconds,
  }
}

/**
 * Record a failed login attempt and lock the account if threshold is reached
 */
export const recordFailedAttempt = async (userId: number): Promise<LockoutStatus> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  if (!user) {
    return {
      isLocked: false,
      lockedAt: null,
      lockoutUntil: null,
      failedLoginAttempts: 0,
      remainingLockoutSeconds: null,
    }
  }

  const newFailedAttempts = user.failedLoginAttempts + 1
  const now = new Date()

  // Check if we need to lock the account
  if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000)

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newFailedAttempts,
        lockoutUntil,
        lockedAt: user.lockoutUntil ? user.lockedAt : now, // Keep existing lockedAt if already locked
      },
    })

    return {
      isLocked: true,
      lockedAt: user.lockedAt || now,
      lockoutUntil,
      failedLoginAttempts: newFailedAttempts,
      remainingLockoutSeconds: ACCOUNT_LOCKOUT_MINUTES * 60,
    }
  }

  // Just increment failed attempts without locking
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newFailedAttempts,
    },
  })

  return {
    isLocked: false,
    lockedAt: null,
    lockoutUntil: null,
    failedLoginAttempts: newFailedAttempts,
    remainingLockoutSeconds: null,
  }
}

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedAttempts = async (userId: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lockedAt: null,
    },
  })
}

/**
 * Manually unlock an account (by parent/admin)
 */
export const unlockAccount = async (userId: number): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lockedAt: null,
    },
  })
}

/**
 * Get remaining lockout time in seconds
 */
export const getRemainingLockoutSeconds = async (userId: number): Promise<number | null> => {
  const status = await isLocked(userId)
  return status.remainingLockoutSeconds
}

/**
 * Check if email/username is locked (used before attempting login)
 */
export const checkEmailLockout = async (email: string): Promise<{
  isLocked: boolean
  message: string
  remainingLockoutSeconds: number | null
}> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
      lockedAt: true,
    },
  })

  if (!user) {
    // Don't reveal if user exists
    return {
      isLocked: false,
      message: 'Invalid credentials',
      remainingLockoutSeconds: null,
    }
  }

  const status = await isLocked(user.id)

  if (status.isLocked && status.lockoutUntil) {
    return {
      isLocked: true,
      message: `Account is locked. Try again in ${Math.ceil((status.lockoutUntil.getTime() - Date.now()) / 60000)} minutes.`,
      remainingLockoutSeconds: status.remainingLockoutSeconds,
    }
  }

  return {
    isLocked: false,
    message: 'Invalid credentials',
    remainingLockoutSeconds: null,
  }
}
