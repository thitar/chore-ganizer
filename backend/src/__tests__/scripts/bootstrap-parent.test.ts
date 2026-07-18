jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { count: jest.fn(), create: jest.fn() },
    $disconnect: jest.fn(),
  },
}))
jest.mock('bcrypt', () => ({ hash: jest.fn() }))

const { prisma } = require('../../config/prisma')
const { hash } = require('bcrypt')

let bootstrapParent: typeof import('../../scripts/bootstrap-parent').bootstrapParent

beforeAll(async () => {
  const mod = await import('../../scripts/bootstrap-parent')
  bootstrapParent = mod.bootstrapParent
})

describe('bootstrapParent', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = {
      ...originalEnv,
      BOOTSTRAP_PARENT_NAME: 'Parent',
      BOOTSTRAP_PARENT_EMAIL: 'parent@example.test',
      BOOTSTRAP_PARENT_PASSWORD: 'initial-password',
      BOOTSTRAP_PARENT_COLOR: '#4F46E5',
    }
  })

  afterAll(() => { process.env = originalEnv })

  it('creates exactly one bcrypt-hashed parent on an empty database', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
    ;(hash as jest.Mock).mockResolvedValue('bcrypt-hash')
    ;(prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 })

    await bootstrapParent()

    expect(hash).toHaveBeenCalledWith('initial-password', 10)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Parent', email: 'parent@example.test', password: 'bcrypt-hash',
        role: 'PARENT', color: '#4F46E5',
      },
    })
  })

  it('fails without creating data when an empty database lacks bootstrap credentials', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
    delete process.env.BOOTSTRAP_PARENT_PASSWORD

    await expect(bootstrapParent()).rejects.toThrow(/BOOTSTRAP_PARENT_PASSWORD/)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('skips bootstrap without reading credentials when a user already exists', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(1)
    delete process.env.BOOTSTRAP_PARENT_NAME
    delete process.env.BOOTSTRAP_PARENT_EMAIL
    delete process.env.BOOTSTRAP_PARENT_PASSWORD

    await expect(bootstrapParent()).resolves.toEqual({ created: false })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
