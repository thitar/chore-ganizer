import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)

  const dad = await prisma.user.upsert({
    where: { email: 'dad@home.local' },
    update: {},
    create: {
      email: 'dad@home.local',
      name: 'Dad',
      password: hash,
      role: 'PARENT',
      color: '#4F46E5',
    },
  })

  const mom = await prisma.user.upsert({
    where: { email: 'mom@home.local' },
    update: {},
    create: {
      email: 'mom@home.local',
      name: 'Mom',
      password: hash,
      role: 'PARENT',
      color: '#EC4899',
    },
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@home.local' },
    update: {},
    create: {
      email: 'alice@home.local',
      name: 'Alice',
      password: hash,
      role: 'CHILD',
      color: '#10B981',
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@home.local' },
    update: {},
    create: {
      email: 'bob@home.local',
      name: 'Bob',
      password: hash,
      role: 'CHILD',
      color: '#F59E0B',
    },
  })

  const templates = [
    { title: 'Wash Dishes', description: 'Load and run the dishwasher, put away clean dishes', points: 10, category: 'kitchen', createdById: dad.id },
    { title: 'Take Out Trash', description: 'Empty all trash bins and take to outside bin', points: 5, category: 'chores', createdById: dad.id },
    { title: 'Clean Room', description: 'Tidy up bedroom: make bed, put away clothes, vacuum', points: 15, category: 'bedroom', createdById: mom.id },
    { title: 'Make Bed', description: 'Make your bed neatly each morning', points: 5, category: 'bedroom', createdById: mom.id },
  ]

  await prisma.recurringOccurrence.deleteMany()
  await prisma.recurringChore.deleteMany()
  await prisma.choreAssignment.deleteMany()
  await prisma.choreTemplate.deleteMany()

  // Templates: find-or-create by title (idempotent)
  const createdTemplates: Array<{ id: number; title: string }> = []
  for (const tpl of templates) {
    const existing = await prisma.choreTemplate.findFirst({ where: { title: tpl.title } })
    const row = existing
      ? await prisma.choreTemplate.update({ where: { id: existing.id }, data: tpl })
      : await prisma.choreTemplate.create({ data: tpl })
    createdTemplates.push({ id: row.id, title: row.title })
  }

  const makeBed = createdTemplates.find((t) => t.title === 'Make Bed')
  const takeOutTrash = createdTemplates.find((t) => t.title === 'Take Out Trash')

  if (makeBed) {
    const existing = await prisma.recurringChore.findFirst({ where: { choreTemplateId: makeBed.id } })
    if (!existing) {
      await prisma.recurringChore.create({
        data: {
          choreTemplateId: makeBed.id,
          assignedToId: alice.id,
          frequency: 'DAILY',
          createdById: dad.id,
        },
      })
    }
  }

  if (takeOutTrash) {
    const existing = await prisma.recurringChore.findFirst({ where: { choreTemplateId: takeOutTrash.id } })
    if (!existing) {
      await prisma.recurringChore.create({
        data: {
          choreTemplateId: takeOutTrash.id,
          assignedToId: bob.id,
          frequency: 'WEEKLY',
          dayOfWeek: 1,
          createdById: mom.id,
        },
      })
    }
  }

  // Point logs: only seed if none exist for these users yet (idempotent)
  const existingPointLogCount = await prisma.pointLog.count({
    where: { reason: { in: ['Wash Dishes', 'Clean Room', 'Great week of chores!', 'Snack correction'] } },
  })
  if (existingPointLogCount === 0) {
    await prisma.pointLog.createMany({
      data: [
        { userId: alice.id, amount: 10, type: 'EARNED', reason: 'Wash Dishes' },
        { userId: bob.id, amount: 15, type: 'EARNED', reason: 'Clean Room' },
        { userId: alice.id, amount: 15, type: 'BONUS', reason: 'Great week of chores!' },
        { userId: bob.id, amount: -5, type: 'ADJUSTMENT', reason: 'Snack correction' },
      ],
    })
  }

  console.log('Seed complete: 4 users, 4 chore templates, 4 point logs, 2 recurring chores')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
