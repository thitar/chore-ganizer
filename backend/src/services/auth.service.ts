import bcrypt from 'bcrypt'
import { randomBytes, createHash } from 'crypto'
import nodemailer from 'nodemailer'
import { Session } from 'express-session'
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { isSmtpConfigured, getSmtpConfig } from '../config/smtp'

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  // bcrypt.compare uses the salt embedded in the stored hash.
  // Seed script (prisma/seed.ts) hashes with bcrypt.hash(password, 10) —
  // the default 10-round cost factor used by both seeder and compare.
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw new AppError('Invalid credentials', 401)
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function logout(session: Session) {
  return new Promise<{ success: true }>((resolve, reject) => {
    session.destroy((err) => {
      if (err) reject(err)
      else resolve({ success: true })
    })
  })
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const frontendUrl = process.env.FRONTEND_URL ?? ''
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !isSmtpConfigured || !frontendUrl) {
    if (!isSmtpConfigured) {
      console.warn('[auth] Password reset requested but SMTP is not configured — email not sent')
    } else if (!frontendUrl) {
      console.warn('[auth] Password reset requested but FRONTEND_URL is not set — cannot generate reset link')
    }
    // Dummy hash to prevent timing side-channel (user enumeration)
    await bcrypt.hash('dummy', 10)
    return { message: 'If an account exists with that email, you will receive a password reset link.' }
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: tokenHash, resetTokenExpiry: expires },
  })

  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`
  const smtp = getSmtpConfig()

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  })

  // Fire-and-forget: don't await the SMTP round-trip before responding, or
  // its network latency becomes a timing side-channel that leaks whether the
  // account exists (defeats the anti-enumeration goal of this message).
  transporter
    .sendMail({
      from: smtp.from,
      to: user.email,
      subject: 'Chore-Ganizer Password Reset',
      text: `You requested a password reset. Click the link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    })
    .then(() => {
      console.log(`[auth] Password reset email sent to ${user.email}`)
    })
    .catch(err => {
      console.error('[auth] Failed to send password reset email:', err)
    })

  return { message: 'If an account exists with that email, you will receive a password reset link.' }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const tokenHash = hashToken(token)

  const user = await prisma.user.findFirst({
    where: {
      resetToken: tokenHash,
      resetTokenExpiry: { gt: new Date() },
    },
  })

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400)
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return { message: 'Password has been reset. You can now sign in.' }
}
