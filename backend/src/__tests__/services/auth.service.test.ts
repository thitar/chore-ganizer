jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('../../config/smtp', () => ({
  isSmtpConfigured: true,
  getSmtpConfig: jest.fn().mockReturnValue({
    host: 'smtp.test.com',
    port: 465,
    user: 'test@test.com',
    pass: 'test-pass',
    from: 'test@test.com',
  }),
}))

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}))

const { prisma } = require('../../config/prisma')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')

let authService: typeof import('../../services/auth.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/auth.service')]
  authService = require('../../services/auth.service')
})

describe('authService.forgotPassword', () => {
  it('returns generic message when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    bcrypt.hash.mockResolvedValue('dummy-hash')

    const result = await authService.forgotPassword('nobody@test.com')
    expect(result.message).toContain('If an account exists')
    expect(bcrypt.hash).toHaveBeenCalledWith('dummy', 10)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('generates token and sends email when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'user@test.com' })
    prisma.user.update.mockResolvedValue({})
    process.env.FRONTEND_URL = 'https://example.com'

    const result = await authService.forgotPassword('user@test.com')
    expect(result.message).toContain('If an account exists')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    )
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalled()

    delete process.env.FRONTEND_URL
  })
})

describe('authService.resetPassword', () => {
  it('rejects invalid token', async () => {
    prisma.user.findFirst.mockResolvedValue(null)

    await expect(
      authService.resetPassword('invalid-token', 'newpass123')
    ).rejects.toThrow('Invalid or expired reset token')
  })

  it('rejects expired token', async () => {
    const pastDate = new Date(Date.now() - 60000)
    prisma.user.findFirst.mockResolvedValue(null) // findFirst with expiry > now returns nothing

    await expect(
      authService.resetPassword('expired-token', 'newpass123')
    ).rejects.toThrow('Invalid or expired reset token')
  })

  it('hashes new password and clears token on success', async () => {
    const futureDate = new Date(Date.now() + 60000)
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      resetToken: 'some-hash',
      resetTokenExpiry: futureDate,
    })
    bcrypt.hash.mockResolvedValue('new-hashed-password')
    prisma.user.update.mockResolvedValue({})

    const result = await authService.resetPassword('valid-token', 'newpass123')
    expect(result.message).toContain('Password has been reset')
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          password: 'new-hashed-password',
          resetToken: null,
          resetTokenExpiry: null,
        }),
      })
    )
  })

  it('prevents token replay after successful use', async () => {
    const futureDate = new Date(Date.now() + 60000)
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: 1,
        resetToken: 'some-hash',
        resetTokenExpiry: futureDate,
      })
      .mockResolvedValueOnce(null) // second call: token cleared
    bcrypt.hash.mockResolvedValue('hashed')
    prisma.user.update.mockResolvedValue({})

    await authService.resetPassword('valid-token', 'newpass123')

    await expect(
      authService.resetPassword('valid-token', 'newpass123')
    ).rejects.toThrow('Invalid or expired reset token')
  })
})
