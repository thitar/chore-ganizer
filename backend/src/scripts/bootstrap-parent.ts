import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

function required(name: 'BOOTSTRAP_PARENT_NAME' | 'BOOTSTRAP_PARENT_EMAIL' | 'BOOTSTRAP_PARENT_PASSWORD') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set when initializing an empty database`)
  return value
}

export async function bootstrapParent() {
  if (await prisma.user.count() > 0) return { created: false }

  const name = required('BOOTSTRAP_PARENT_NAME')
  const email = required('BOOTSTRAP_PARENT_EMAIL')
  const password = required('BOOTSTRAP_PARENT_PASSWORD')
  const color = process.env.BOOTSTRAP_PARENT_COLOR || '#4F46E5'

  if (name.length > 50) throw new Error('BOOTSTRAP_PARENT_NAME must be 1-50 characters')
  if (!EMAIL_REGEX.test(email)) throw new Error('BOOTSTRAP_PARENT_EMAIL must be a valid email address')
  if (password.length < 6) throw new Error('BOOTSTRAP_PARENT_PASSWORD must be at least 6 characters')
  if (!HEX_REGEX.test(color)) throw new Error('BOOTSTRAP_PARENT_COLOR must be a hex color (#RRGGBB)')

  await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10), role: 'PARENT', color },
  })
  return { created: true }
}

if (require.main === module) {
  bootstrapParent()
    .then(({ created }) => console.log(created ? '[bootstrap] Created first parent' : '[bootstrap] User exists; skipped'))
    .catch((error) => { console.error(`[bootstrap] ${error.message}`); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
