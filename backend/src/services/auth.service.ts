import bcrypt from 'bcrypt'
import { Session } from 'express-session'
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

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
