import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', 10)

  // Create parent users
  const dad = await prisma.user.upsert({
    where: { email: 'dad@home.local' },
    update: {},
    create: {
      email: 'dad@home.local',
      password: passwordHash,
      name: 'Dad',
      role: 'PARENT',
      points: 0,
    },
  })

  const mom = await prisma.user.upsert({
    where: { email: 'mom@home.local' },
    update: {},
    create: {
      email: 'mom@home.local',
      password: passwordHash,
      name: 'Mom',
      role: 'PARENT',
      points: 0,
    },
  })

  // Create child users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@home.local' },
    update: {},
    create: {
      email: 'alice@home.local',
      password: passwordHash,
      name: 'Alice',
      role: 'CHILD',
      points: 0,
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@home.local' },
    update: {},
    create: {
      email: 'bob@home.local',
      password: passwordHash,
      name: 'Bob',
      role: 'CHILD',
      points: 0,
    },
  })

  console.log('✅ Users created:', { dad: dad.id, mom: mom.id, alice: alice.id, bob: bob.id })

  // Create chore categories
  const cleaning = await prisma.choreCategory.upsert({
    where: { name: 'Cleaning' },
    update: {},
    create: {
      name: 'Cleaning',
      description: 'House cleaning chores',
      icon: 'broom',
      color: '#4CAF50',
    },
  })

  const kitchen = await prisma.choreCategory.upsert({
    where: { name: 'Kitchen' },
    update: {},
    create: {
      name: 'Kitchen',
      description: 'Kitchen and cooking related chores',
      icon: 'utensils',
      color: '#FF9800',
    },
  })

  const outdoor = await prisma.choreCategory.upsert({
    where: { name: 'Outdoor' },
    update: {},
    create: {
      name: 'Outdoor',
      description: 'Outdoor and yard work',
      icon: 'tree',
      color: '#8BC34A',
    },
  })

  const personal = await prisma.choreCategory.upsert({
    where: { name: 'Personal' },
    update: {},
    create: {
      name: 'Personal',
      description: 'Personal care and organization',
      icon: 'user',
      color: '#2196F3',
    },
  })

  console.log('✅ Categories created:', { cleaning: cleaning.id, kitchen: kitchen.id, outdoor: outdoor.id, personal: personal.id })

  // Create chore templates
  const template1 = await prisma.choreTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Clean bedroom',
      description: 'Make bed and pick up toys',
      points: 10,
      createdById: dad.id,
    },
  })

  const template2 = await prisma.choreTemplate.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Do dishes',
      description: 'Wash and dry all dishes',
      points: 15,
      createdById: dad.id,
    },
  })

  const template3 = await prisma.choreTemplate.upsert({
    where: { id: 3 },
    update: {},
    create: {
      title: 'Take out trash',
      description: 'Empty all trash bins',
      points: 5,
      createdById: mom.id,
    },
  })

  const template4 = await prisma.choreTemplate.upsert({
    where: { id: 4 },
    update: {},
    create: {
      title: 'Feed the pets',
      description: 'Give food and water to pets',
      points: 5,
      createdById: mom.id,
    },
  })

  console.log('✅ Templates created:', { 
    template1: template1.id, 
    template2: template2.id, 
    template3: template3.id, 
    template4: template4.id 
  })

  // Create sample assignments (due today and tomorrow)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)

  const assignment1 = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: template1.id,
      assignedToId: alice.id,
      assignedById: dad.id,
      dueDate: today,
    },
  })

  const assignment2 = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: template2.id,
      assignedToId: bob.id,
      assignedById: dad.id,
      dueDate: today,
    },
  })

  const assignment3 = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: template3.id,
      assignedToId: alice.id,
      assignedById: mom.id,
      dueDate: tomorrow,
    },
  })

  const assignment4 = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: template4.id,
      assignedToId: bob.id,
      assignedById: mom.id,
      dueDate: tomorrow,
    },
  })

  console.log('✅ Assignments created:', { 
    assignment1: assignment1.id, 
    assignment2: assignment2.id, 
    assignment3: assignment3.id, 
    assignment4: assignment4.id 
  })

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
