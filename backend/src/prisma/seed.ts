import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', 10)

  // Create parent users
  const dad = await prisma.user.upsert({
    where: { email: 'dad@home' },
    update: {},
    create: {
      email: 'dad@home',
      password: passwordHash,
      name: 'Dad',
      role: 'PARENT',
      points: 0,
    },
  })

  const mom = await prisma.user.upsert({
    where: { email: 'mom@home' },
    update: {},
    create: {
      email: 'mom@home',
      password: passwordHash,
      name: 'Mom',
      role: 'PARENT',
      points: 0,
    },
  })

  // Create child users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@home' },
    update: {},
    create: {
      email: 'alice@home',
      password: passwordHash,
      name: 'Alice',
      role: 'CHILD',
      points: 0,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@home' },
    update: {},
    create: {
      email: 'bob@home',
      password: passwordHash,
      name: 'Bob',
      role: 'CHILD',
      points: 0,
    },
  })

  console.log('✅ Users created:', { dad: dad.id, mom: mom.id, alice: alice.id, bob: bob.id })

  // Create sample chores
  const chore1 = await prisma.chore.create({
    data: {
      title: 'Clean bedroom',
      description: 'Make bed and pick up toys',
      points: 10,
      assignedToId: alice.id,
    },
  })

  const chore2 = await prisma.chore.create({
    data: {
      title: 'Do dishes',
      description: 'Wash and dry all dishes',
      points: 15,
      assignedToId: bob.id,
    },
  })

  const chore3 = await prisma.chore.create({
    data: {
      title: 'Take out trash',
      description: 'Empty all trash bins',
      points: 5,
      assignedToId: alice.id,
    },
  })

  const chore4 = await prisma.chore.create({
    data: {
      title: 'Feed the pets',
      description: 'Give food and water to pets',
      points: 5,
      assignedToId: bob.id,
    },
  })

  console.log('✅ Chores created:', { chore1: chore1.id, chore2: chore2.id, chore3: chore3.id, chore4: chore4.id })

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
