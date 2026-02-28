# 🏠 Chore-Ganizer Development Plan
## Complete Implementation Guide for Homelab Deployment

**Version:** 1.0  
**Last Updated:** February 2026  
**Estimated Timeline:** 3 weeks for MVP, +2-3 weeks for enhanced features  
**Target Environment:** Homelab with Docker Compose

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Initial Setup](#initial-setup)
5. [Configuration Files](#configuration-files)
6. [Database Schema](#database-schema)
7. [Development Milestones](#development-milestones)
8. [Docker Setup](#docker-setup)
9. [Deployment Guide](#deployment-guide)
10. [Testing Strategy](#testing-strategy)
11. [Backup & Maintenance](#backup--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

### Core Features (MVP - Week 1-3)
- ✅ Simple authentication (email/password)
- ✅ Chore CRUD operations
- ✅ Assign chores to family members
- ✅ Mark chores as complete
- ✅ Points system (foundation for rewards)
- ✅ Basic in-app notifications
- ✅ Kid-friendly, colorful UI
- ✅ Role-based access (Parent/Child)

### Enhanced Features (Week 4-6)
- 🔜 Rewards marketplace
- 🔜 Recurring chores (daily/weekly/monthly)
- 🔜 Round-robin assignment rotation
- 🔜 Advanced notifications

### Deliberately Excluded (For Homelab)
- ❌ User registration flow (family members are seeded)
- ❌ Password reset via email
- ❌ Push notifications
- ❌ OAuth/Social login
- ❌ Multi-tenant/household support
- ❌ Advanced analytics
- ❌ Mobile native apps
- ❌ CI/CD pipelines (manual deployment)

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (faster than CRA)
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **Zustand** - State management (lightweight)
- **React Query** - Server state management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Framer Motion** - Animations (optional)

### Backend
- **Node.js 20** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma ORM** - Database toolkit
- **SQLite** - Database (single file, perfect for homelab)
- **Bcrypt** - Password hashing
- **Express Session** - Session management
- **Zod** - Validation
- **Winston** - Logging (optional)

### DevOps
- **Docker** - Containerization (production only)
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Frontend serving in production
- **PM2** - Alternative to Docker if preferred

---

## 📁 Project Structure

```
chore-ganizer/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── docker-compose.dev.yml (optional)
├── backup.sh
├── 
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.dev (optional)
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   └── src/
│       ├── server.ts
│       ├── app.ts
│       │
│       ├── config/
│       │   └── database.ts
│       │
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── errorHandler.ts
│       │   ├── roleCheck.ts
│       │   └── validator.ts
│       │
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── chores.routes.ts
│       │   ├── users.routes.ts
│       │   ├── notifications.routes.ts
│       │   ├── rewards.routes.ts (future)
│       │   └── rotations.routes.ts (future)
│       │
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── chores.controller.ts
│       │   ├── users.controller.ts
│       │   └── notifications.controller.ts
│       │
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── chores.service.ts
│       │   ├── points.service.ts
│       │   ├── notifications.service.ts
│       │   └── recurring.service.ts (future)
│       │
│       ├── utils/
│       │   ├── logger.ts
│       │   └── asyncHandler.ts
│       │
│       └── types/
│           ├── express.d.ts
│           └── session.d.ts
│
├── frontend/
│   ├── Dockerfile
│   ├── Dockerfile.dev (optional)
│   ├── .dockerignore
│   ├── nginx.conf
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   └── favicon.ico
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Footer.tsx
│       │   │
│       │   ├── chores/
│       │   │   ├── ChoreCard.tsx
│       │   │   ├── ChoreForm.tsx
│       │   │   ├── ChoreList.tsx
│       │   │   └── ChoreFilters.tsx
│       │   │
│       │   ├── notifications/
│       │   │   ├── NotificationBell.tsx
│       │   │   └── NotificationList.tsx
│       │   │
│       │   └── common/
│       │       ├── Button.tsx
│       │       ├── Input.tsx
│       │       ├── Modal.tsx
│       │       ├── Loading.tsx
│       │       └── ErrorBoundary.tsx
│       │
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Chores.tsx
│       │   ├── Profile.tsx
│       │   └── NotFound.tsx
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useChores.ts
│       │   ├── useNotifications.ts
│       │   └── useUser.ts
│       │
│       ├── store/
│       │   └── authStore.ts
│       │
│       ├── api/
│       │   ├── client.ts
│       │   ├── auth.api.ts
│       │   ├── chores.api.ts
│       │   ├── users.api.ts
│       │   └── notifications.api.ts
│       │
│       ├── types/
│       │   ├── chore.types.ts
│       │   ├── user.types.ts
│       │   └── notification.types.ts
│       │
│       └── utils/
│           ├── formatters.ts
│           └── validators.ts
│
└── data/
    ├── chores.db (gitignored)
    ├── uploads/ (gitignored)
    └── backups/ (gitignored)
```

---

## 🚀 Initial Setup

### Prerequisites

```bash
# Check versions
node --version  # Should be v20+
npm --version   # Should be v10+
docker --version
docker-compose --version
```

### Step 1: Create Project Structure

```bash
# Create main directory
mkdir chore-ganizer
cd chore-ganizer

# Create subdirectories
mkdir -p backend/src/{config,middleware,routes,controllers,services,utils,types}
mkdir -p backend/prisma
mkdir -p frontend/src/{components/{layout,chores,notifications,common},pages,hooks,store,api,types,utils}
mkdir -p frontend/public
mkdir -p data/{uploads,backups}

# Initialize git
git init
```

### Step 2: Initialize Backend

```bash
cd backend

# Initialize npm project
npm init -y

# Install dependencies
npm install express cors express-session bcrypt dotenv zod
npm install @prisma/client
npm install -D typescript @types/node @types/express @types/bcrypt @types/express-session
npm install -D ts-node nodemon prisma
npm install -D @types/cors

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init --datasource-provider sqlite
```

### Step 3: Initialize Frontend

```bash
cd ../frontend

# Create Vite project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install
npm install react-router-dom axios zustand
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react
npm install @tanstack/react-query
npm install -D @types/node

# Initialize Tailwind
npx tailwindcss init -p
```

---

## ⚙️ Configuration Files

### Root .gitignore

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Environment variables
.env
.env.local
.env.development
.env.production
**/.env

# Database
*.db
*.db-journal
*.db-shm
*.db-wal
data/chores.db
data/uploads/*
data/backups/*
!data/uploads/.gitkeep
!data/backups/.gitkeep

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
**/dist/
**/build/

# Testing
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# OS
Thumbs.db
.DS_Store

# Docker
*.pid
*.seed
*.pid.lock

# Temporary files
tmp/
temp/
*.tmp

# Production
uploads/*
!uploads/.gitkeep
```

### Root .env.example

```bash
# ============================================
# ENVIRONMENT CONFIGURATION
# ============================================
# Copy this file to .env and fill in your values
# NEVER commit .env to git

NODE_ENV=production

# ============================================
# BACKEND CONFIGURATION
# ============================================

# Database
DATABASE_URL="file:/app/data/chores.db"

# Session Secret (CRITICAL: Generate a strong random secret)
# Generate with: openssl rand -base64 32
SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARACTERS

# Server
PORT=3000
BACKEND_URL=http://localhost:3000

# Session Configuration
SESSION_MAX_AGE=604800000
# 604800000 ms = 7 days
# 86400000 ms = 1 day
# 3600000 ms = 1 hour

# CORS
CORS_ORIGIN=http://localhost:3001

# ============================================
# FRONTEND CONFIGURATION
# ============================================

# API URL (used by frontend to connect to backend)
VITE_API_URL=http://localhost:3000

# ============================================
# OPTIONAL: MONITORING & LOGGING
# ============================================

# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# Sentry (if you want error tracking)
# SENTRY_DSN=

# ============================================
# OPTIONAL: FUTURE FEATURES
# ============================================

# Email (for future password reset feature)
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=

# Push Notifications (for future feature)
# FCM_SERVER_KEY=
# FCM_PROJECT_ID=

# ============================================
# DEVELOPMENT OVERRIDES
# ============================================
# These will be different in development
# Create a .env.development file for local dev
```

### Backend .env.example

```bash
# Backend Environment Variables
# Copy to .env and customize

NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
SESSION_SECRET="dev-secret-not-secure-change-in-production"
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

### Frontend .env.example

```bash
# Frontend Environment Variables
# Copy to .env and customize

VITE_API_URL=http://localhost:3000
```

### Backend package.json

```json
{
  "name": "chore-ganizer-backend",
  "version": "2.0.0",
  "description": "Backend API for Chore-ganizer",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:deploy": "prisma migrate deploy",
    "db:seed": "ts-node prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "lint": "eslint . --ext .ts",
    "clean": "rm -rf dist"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "keywords": ["chores", "family", "homelab"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@prisma/client": "^5.8.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "^20.11.0",
    "nodemon": "^3.0.2",
    "prisma": "^5.8.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "express"]
  },
  "include": ["src/**/*", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Backend nodemon.json

```json
{
  "watch": ["src", "prisma"],
  "ext": "ts,prisma",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node ./src/server.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Frontend package.json

```json
{
  "name": "chore-ganizer-frontend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.17.19",
    "axios": "^1.6.5",
    "lucide-react": "^0.312.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
```

### Frontend vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

### Frontend tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### Frontend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🗄️ Database Schema

### prisma/schema.prisma

```prisma
// Chore-Ganizer Database Schema
// SQLite for homelab deployment

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MANAGEMENT
// ============================================

enum UserRole {
  PARENT
  CHILD
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String
  role      UserRole @default(CHILD)
  avatarUrl String?  // Optional profile picture path
  points    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  choresCreated   Chore[]           @relation("CreatedChores")
  assignedChores  ChoreAssignment[]
  completedChores ChoreCompletion[]
  notifications   Notification[]

  @@index([email])
  @@index([role])
}

// ============================================
// CHORES
// ============================================

enum ChoreStatus {
  PENDING
  COMPLETED
}

model Chore {
  id          String      @id @default(cuid())
  title       String
  description String?
  pointsValue Int         @default(0)
  status      ChoreStatus @default(PENDING)

  // Metadata
  createdById String
  createdBy   User     @relation("CreatedChores", fields: [createdById], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  assignments ChoreAssignment[]
  completions ChoreCompletion[]

  @@index([status])
  @@index([createdById])
}

model ChoreAssignment {
  id         String    @id @default(cuid())
  choreId    String
  chore      Chore     @relation(fields: [choreId], references: [id], onDelete: Cascade)
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedAt DateTime  @default(now())
  dueDate    DateTime? // Optional specific due date
  isActive   Boolean   @default(true)

  @@unique([choreId, userId, isActive])
  @@index([userId, isActive])
  @@index([choreId])
}

model ChoreCompletion {
  id           String   @id @default(cuid())
  choreId      String
  chore        Chore    @relation(fields: [choreId], references: [id], onDelete: Cascade)
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  pointsEarned Int      // Points at time of completion
  completedAt  DateTime @default(now())
  notes        String?  // Optional completion notes

  @@index([userId])
  @@index([choreId])
  @@index([completedAt])
}

// ============================================
// NOTIFICATIONS
// ============================================

enum NotificationType {
  CHORE_ASSIGNED
  CHORE_COMPLETED
  POINTS_EARNED
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  isRead    Boolean          @default(false)
  actionUrl String?          // Optional link to relevant page
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}

// ============================================
// FUTURE: REWARDS SYSTEM
// ============================================
// Uncomment when implementing rewards feature
//
// model Reward {
//   id          String   @id @default(cuid())
//   title       String
//   description String?
//   pointsCost  Int
//   iconUrl     String?
//   isActive    Boolean  @default(true)
//   createdAt   DateTime @default(now())
//   updatedAt   DateTime @updatedAt
//   redemptions RewardRedemption[]
//   @@index([pointsCost])
// }
//
// model RewardRedemption {
//   id          String    @id @default(cuid())
//   rewardId    String
//   reward      Reward    @relation(fields: [rewardId], references: [id], onDelete: Cascade)
//   userId      String
//   user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
//   pointsSpent Int
//   redeemedAt  DateTime  @default(now())
//   fulfilledAt DateTime?
//   notes       String?
//   @@index([userId])
//   @@index([redeemedAt])
// }

// ============================================
// FUTURE: RECURRING CHORES
// ============================================
// Uncomment when implementing recurring chores
//
// enum RecurrenceType {
//   NONE
//   DAILY
//   WEEKLY
//   MONTHLY
// }
//
// Add to Chore model:
// recurrenceType  RecurrenceType @default(NONE)
// recurrenceDayOfWeek Int?  // 0-6 for weekly
// recurrenceDayOfMonth Int? // 1-31 for monthly
// nextDueDate     DateTime?

// ============================================
// FUTURE: ROUND-ROBIN ASSIGNMENT
// ============================================
// Uncomment when implementing rotation
//
// model RotationGroup {
//   id           String   @id @default(cuid())
//   name         String
//   description  String?
//   currentIndex Int      @default(0)
//   createdAt    DateTime @default(now())
//   updatedAt    DateTime @updatedAt
//   members      RotationGroupMember[]
//   chores       Chore[]
//   @@index([currentIndex])
// }
//
// model RotationGroupMember {
//   id              String        @id @default(cuid())
//   rotationGroupId String
//   rotationGroup   RotationGroup @relation(fields: [rotationGroupId], references: [id], onDelete: Cascade)
//   userId          String
//   user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
//   orderIndex      Int
//   joinedAt        DateTime      @default(now())
//   @@unique([rotationGroupId, userId])
//   @@unique([rotationGroupId, orderIndex])
//   @@index([rotationGroupId, orderIndex])
// }
//
// Add to Chore model:
// rotationGroupId String?
// rotationGroup   RotationGroup? @relation(fields: [rotationGroupId], references: [id])
```

### prisma/seed.ts

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - be careful in production!)
  await prisma.notification.deleteMany();
  await prisma.choreCompletion.deleteMany();
  await prisma.choreAssignment.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.user.deleteMany();

  console.log('✨ Creating users...');

  // Create family members
  // IMPORTANT: Change these to match your family!
  const users = [
    {
      email: 'dad@home',
      password: await bcrypt.hash('password123', 10),
      name: 'Dad',
      role: UserRole.PARENT,
      points: 0,
    },
    {
      email: 'mom@home',
      password: await bcrypt.hash('password123', 10),
      name: 'Mom',
      role: UserRole.PARENT,
      points: 0,
    },
    {
      email: 'alice@home',
      password: await bcrypt.hash('password123', 10),
      name: 'Alice',
      role: UserRole.CHILD,
      points: 150,
    },
    {
      email: 'bob@home',
      password: await bcrypt.hash('password123', 10),
      name: 'Bob',
      role: UserRole.CHILD,
      points: 200,
    },
  ];

  const createdUsers = [];
  for (const user of users) {
    const created = await prisma.user.create({ data: user });
    createdUsers.push(created);
    console.log(`  ✓ Created user: ${created.name} (${created.email})`);
  }

  const [dad, mom, alice, bob] = createdUsers;

  console.log('✨ Creating sample chores...');

  // Sample chores
  const chores = [
    {
      title: 'Wash the dishes',
      description: 'Clean all dishes from dinner',
      pointsValue: 10,
      createdById: dad.id,
    },
    {
      title: 'Take out the trash',
      description: 'Empty all trash bins and take to curb',
      pointsValue: 5,
      createdById: mom.id,
    },
    {
      title: 'Clean your room',
      description: 'Make bed, organize desk, vacuum floor',
      pointsValue: 15,
      createdById: mom.id,
    },
    {
      title: 'Feed the dog',
      description: 'Give Max his breakfast and fresh water',
      pointsValue: 5,
      createdById: dad.id,
    },
    {
      title: 'Do homework',
      description: 'Complete all assignments before dinner',
      pointsValue: 20,
      createdById: mom.id,
    },
  ];

  const createdChores = [];
  for (const chore of chores) {
    const created = await prisma.chore.create({ data: chore });
    createdChores.push(created);
    console.log(`  ✓ Created chore: ${created.title}`);
  }

  console.log('✨ Creating chore assignments...');

  // Assign some chores
  await prisma.choreAssignment.create({
    data: {
      choreId: createdChores[0].id, // Dishes
      userId: alice.id,
      isActive: true,
    },
  });

  await prisma.choreAssignment.create({
    data: {
      choreId: createdChores[1].id, // Trash
      userId: bob.id,
      isActive: true,
    },
  });

  await prisma.choreAssignment.create({
    data: {
      choreId: createdChores[2].id, // Clean room
      userId: alice.id,
      isActive: true,
    },
  });

  console.log('  ✓ Assigned chores to kids');

  console.log('✨ Creating sample completions...');

  // Some completed chores
  await prisma.choreCompletion.create({
    data: {
      choreId: createdChores[3].id, // Feed dog
      userId: bob.id,
      pointsEarned: 5,
      notes: 'Max was very happy!',
    },
  });

  console.log('  ✓ Created completion history');

  console.log('✨ Creating sample notifications...');

  await prisma.notification.create({
    data: {
      userId: alice.id,
      type: 'CHORE_ASSIGNED',
      title: 'New chore assigned!',
      message: 'You have been assigned: Wash the dishes',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: bob.id,
      type: 'POINTS_EARNED',
      title: 'Points earned!',
      message: 'You earned 5 points for feeding Max',
      isRead: true,
    },
  });

  console.log('  ✓ Created notifications');

  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('👥 Login credentials:');
  console.log('  Parents:');
  console.log('    dad@home / password123');
  console.log('    mom@home / password123');
  console.log('  Kids:');
  console.log('    alice@home / password123');
  console.log('    bob@home / password123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🎯 Development Milestones

### WEEK 1: Foundation & Authentication

#### Milestone 1.1: Project Setup (Day 1)
**Duration:** 4-6 hours

**Tasks:**
- [ ] Create project structure
- [ ] Initialize backend and frontend
- [ ] Install all dependencies
- [ ] Configure TypeScript
- [ ] Set up Prisma with SQLite
- [ ] Create initial database migration
- [ ] Create .env files from examples
- [ ] Test that both apps start

**Deliverables:**
- ✅ Both apps start without errors
- ✅ Database file created
- ✅ Hot reload works in development

**Testing:**
```bash
# Backend
cd backend
npm run dev
# Should see: Server running on port 3000

# Frontend
cd frontend
npm run dev
# Should see: Local: http://localhost:5173
```

---

#### Milestone 1.2: Database Models & Seed (Day 1-2)
**Duration:** 2-3 hours

**Tasks:**
- [ ] Copy the Prisma schema from this document
- [ ] Run initial migration
- [ ] Copy seed script
- [ ] Customize seed data with your family names
- [ ] Run seed script
- [ ] Verify data in Prisma Studio

**Commands:**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio  # Opens browser to view data
```

**Deliverables:**
- ✅ Database tables created
- ✅ Family members exist in database
- ✅ Sample chores exist

---

#### Milestone 1.3: Backend Authentication (Day 2-3)
**Duration:** 6-8 hours

**Tasks:**
- [ ] Create type definitions for Express session
- [ ] Set up Express app with session middleware
- [ ] Create auth service (login, logout)
- [ ] Create auth controller
- [ ] Create auth routes
- [ ] Create auth middleware for protected routes
- [ ] Add error handling middleware
- [ ] Test login/logout with Postman/Thunder Client

**Files to create:**

**src/types/express.d.ts:**
```typescript
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    }

    interface Request {
      user?: User;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
```

**src/server.ts:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
```

**src/app.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

**src/middleware/auth.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
```

**src/middleware/roleCheck.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

**src/middleware/errorHandler.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

**src/services/auth.service.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      points: user.points,
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
        avatarUrl: true,
      },
    });

    return user;
  },
};
```

**src/controllers/auth.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await authService.login(email, password);

      req.session.userId = user.id;

      res.json({
        message: 'Login successful',
        user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return next(err);
        }
        res.json({ message: 'Logout successful' });
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await authService.getUserById(req.user.id);

      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
};
```

**src/routes/auth.routes.ts:**
```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
```

**Deliverables:**
- ✅ POST /api/auth/login returns user data
- ✅ POST /api/auth/logout clears session
- ✅ GET /api/auth/me returns current user (when logged in)
- ✅ Protected routes return 401 when not authenticated

**Testing with curl:**
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@home","password":"password123"}' \
  -c cookies.txt

# Get current user
curl http://localhost:3000/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

#### Milestone 1.4: Frontend Auth UI (Day 3-4)
**Duration:** 6-8 hours

**Tasks:**
- [ ] Set up Axios client with credentials
- [ ] Create auth store (Zustand)
- [ ] Create login page
- [ ] Create protected route wrapper
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test full auth flow

**Files to create:**

**src/api/client.ts:**
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**src/api/auth.api.ts:**
```typescript
import { apiClient } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'PARENT' | 'CHILD';
  points: number;
  avatarUrl?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data.user as User;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.user as User;
  },
};
```

**src/store/authStore.ts:**
```typescript
import { create } from 'zustand';
import { authApi, User } from '../api/auth.api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.login({ email, password });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

**src/pages/Login.tsx:**
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Chore-ganizer 🏠
          </h1>
          <p className="text-gray-600">Welcome back!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="your@home"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>🔑 Use your family email (e.g., alice@home)</p>
        </div>
      </div>
    </div>
  );
};
```

**src/components/common/ProtectedRoute.tsx:**
```typescript
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

**src/App.tsx:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/common/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**src/pages/Dashboard.tsx:** (Temporary placeholder)
```typescript
import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, {user?.name}! 👋
              </h1>
              <p className="text-gray-600">
                Role: {user?.role} | Points: {user?.points}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-blue-800">
              ✅ Authentication is working! Now we'll build the chore features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Deliverables:**
- ✅ Login page works
- ✅ Successful login redirects to dashboard
- ✅ Failed login shows error
- ✅ Logout works
- ✅ Protected routes redirect to login when not authenticated
- ✅ Auth state persists on page refresh

**Manual Testing:**
1. Start both servers
2. Go to http://localhost:5173
3. Should redirect to /login
4. Login with alice@home / password123
5. Should redirect to /dashboard
6. Refresh page - should stay on dashboard
7. Click logout - should redirect to login

---

### WEEK 2: Core Chore Features

#### Milestone 2.1: Backend Chore API (Day 5-6)
**Duration:** 6-8 hours

**Tasks:**
- [ ] Create chore service
- [ ] Create chore controller
- [ ] Create chore routes (CRUD + assign + complete)
- [ ] Add validation
- [ ] Add role checks (only parents can create/delete)
- [ ] Test all endpoints

**src/services/chores.service.ts:**
```typescript
import { PrismaClient, ChoreStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const choresService = {
  async getAll(filters?: { status?: ChoreStatus; userId?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.assignments = {
        some: {
          userId: filters.userId,
          isActive: true,
        },
      };
    }

    return prisma.chore.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        assignments: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string) {
    return prisma.chore.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        assignments: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        completions: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
      },
    });
  },

  async create(data: {
    title: string;
    description?: string;
    pointsValue: number;
    createdById: string;
  }) {
    return prisma.chore.create({
      data,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      pointsValue?: number;
    }
  ) {
    return prisma.chore.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    // This will cascade delete assignments and completions
    return prisma.chore.delete({
      where: { id },
    });
  },

  async assign(choreId: string, userId: string, dueDate?: Date) {
    // Deactivate existing assignments for this chore
    await prisma.choreAssignment.updateMany({
      where: {
        choreId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new assignment
    return prisma.choreAssignment.create({
      data: {
        choreId,
        userId,
        dueDate,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        chore: {
          select: { id: true, title: true },
        },
      },
    });
  },

  async complete(choreId: string, userId: string, notes?: string) {
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
    });

    if (!chore) {
      throw new Error('Chore not found');
    }

    // Create completion record
    const completion = await prisma.choreCompletion.create({
      data: {
        choreId,
        userId,
        pointsEarned: chore.pointsValue,
        notes,
      },
    });

    // Award points to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: chore.pointsValue,
        },
      },
    });

    // Update chore status
    await prisma.chore.update({
      where: { id: choreId },
      data: {
        status: ChoreStatus.COMPLETED,
      },
    });

    // Deactivate assignment
    await prisma.choreAssignment.updateMany({
      where: {
        choreId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return completion;
  },
};
```

**src/controllers/chores.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { choresService } from '../services/chores.service';
import { z } from 'zod';
import { ChoreStatus } from '@prisma/client';

const createChoreSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  pointsValue: z.number().int().min(0).max(1000),
});

const updateChoreSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  pointsValue: z.number().int().min(0).max(1000).optional(),
});

const assignChoreSchema = z.object({
  userId: z.string(),
  dueDate: z.string().datetime().optional(),
});

const completeChoreSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const choresController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as ChoreStatus | undefined;
      const userId = req.query.userId as string | undefined;

      const chores = await choresService.getAll({ status, userId });
      res.json({ chores });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const chore = await choresService.getById(req.params.id);
      
      if (!chore) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.json({ chore });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createChoreSchema.parse(req.body);
      
      const chore = await choresService.create({
        ...data,
        createdById: req.user!.id,
      });

      res.status(201).json({ chore });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateChoreSchema.parse(req.body);
      
      const chore = await choresService.update(req.params.id, data);
      res.json({ chore });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await choresService.delete(req.params.id);
      res.json({ message: 'Chore deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, dueDate } = assignChoreSchema.parse(req.body);
      
      const assignment = await choresService.assign(
        req.params.id,
        userId,
        dueDate ? new Date(dueDate) : undefined
      );

      res.json({ assignment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      next(error);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const { notes } = completeChoreSchema.parse(req.body);
      
      const completion = await choresService.complete(
        req.params.id,
        req.user!.id,
        notes
      );

      res.json({ completion });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      if (error instanceof Error && error.message === 'Chore not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  },
};
```

**src/routes/chores.routes.ts:**
```typescript
import { Router } from 'express';
import { choresController } from '../controllers/chores.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all chores (everyone can view)
router.get('/', choresController.getAll);

// Get single chore
router.get('/:id', choresController.getById);

// Create chore (parents only)
router.post('/', requireRole(UserRole.PARENT), choresController.create);

// Update chore (parents only)
router.put('/:id', requireRole(UserRole.PARENT), choresController.update);

// Delete chore (parents only)
router.delete('/:id', requireRole(UserRole.PARENT), choresController.delete);

// Assign chore (parents only)
router.post('/:id/assign', requireRole(UserRole.PARENT), choresController.assign);

// Complete chore (anyone can complete their assigned chores)
router.post('/:id/complete', choresController.complete);

export default router;
```

**Update src/app.ts to include chore routes:**
```typescript
// Add this import
import choreRoutes from './routes/chores.routes';

// Add this route (after auth routes)
app.use('/api/chores', choreRoutes);
```

**Deliverables:**
- ✅ GET /api/chores - List all chores
- ✅ GET /api/chores/:id - Get single chore
- ✅ POST /api/chores - Create chore (parents only)
- ✅ PUT /api/chores/:id - Update chore (parents only)
- ✅ DELETE /api/chores/:id - Delete chore (parents only)
- ✅ POST /api/chores/:id/assign - Assign chore (parents only)
- ✅ POST /api/chores/:id/complete - Complete chore

**Testing:**
```bash
# Login as parent first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dad@home","password":"password123"}' \
  -c cookies.txt

# Create a chore
curl -X POST http://localhost:3000/api/chores \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Test Chore","description":"Testing","pointsValue":10}'

# List chores
curl http://localhost:3000/api/chores -b cookies.txt
```

---

#### Milestone 2.2: Frontend Chore Components (Day 6-8)
**Duration:** 8-10 hours

This is a large milestone. Create all the components needed for chore management.

**Files to create:**

**src/api/chores.api.ts:**
```typescript
import { apiClient } from './client';

export interface Chore {
  id: string;
  title: string;
  description?: string;
  pointsValue: number;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  assignments: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
    };
    assignedAt: string;
    dueDate?: string;
  }>;
}

export interface CreateChoreData {
  title: string;
  description?: string;
  pointsValue: number;
}

export const choresApi = {
  getAll: async (filters?: { status?: string; userId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);
    
    const { data } = await apiClient.get(`/chores?${params}`);
    return data.chores as Chore[];
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/chores/${id}`);
    return data.chore as Chore;
  },

  create: async (choreData: CreateChoreData) => {
    const { data } = await apiClient.post('/chores', choreData);
    return data.chore as Chore;
  },

  update: async (id: string, choreData: Partial<CreateChoreData>) => {
    const { data } = await apiClient.put(`/chores/${id}`, choreData);
    return data.chore as Chore;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/chores/${id}`);
  },

  assign: async (id: string, userId: string, dueDate?: string) => {
    const { data } = await apiClient.post(`/chores/${id}/assign`, {
      userId,
      dueDate,
    });
    return data.assignment;
  },

  complete: async (id: string, notes?: string) => {
    const { data } = await apiClient.post(`/chores/${id}/complete`, {
      notes,
    });
    return data.completion;
  },
};
```

**src/components/chores/ChoreCard.tsx:**
```typescript
import React from 'react';
import { Chore } from '../../api/chores.api';
import { CheckCircle2, Circle, Star, Trash2 } from 'lucide-react';

interface ChoreCardProps {
  chore: Chore;
  onComplete?: (choreId: string) => void;
  onDelete?: (choreId: string) => void;
  canManage: boolean;
}

export const ChoreCard: React.FC<ChoreCardProps> = ({
  chore,
  onComplete,
  onDelete,
  canManage,
}) => {
  const isCompleted = chore.status === 'COMPLETED';
  const assignee = chore.assignments[0]?.user;

  return (
    <div className={`
      bg-white rounded-lg shadow-md p-6 border-l-4 transition-all hover:shadow-lg
      ${isCompleted ? 'border-green-500 opacity-75' : 'border-purple-500'}
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          {isCompleted ? (
            <CheckCircle2 className="text-green-500 w-6 h-6 flex-shrink-0 mt-1" />
          ) : (
            <Circle className="text-gray-400 w-6 h-6 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${
              isCompleted ? 'line-through text-gray-500' : 'text-gray-800'
            }`}>
              {chore.title}
            </h3>
            {chore.description && (
              <p className="text-gray-600 text-sm mt-1">{chore.description}</p>
            )}
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => onDelete?.(chore.id)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Delete chore"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-semibold">{chore.pointsValue} points</span>
          </div>
          
          {assignee && (
            <div className="text-sm text-gray-600">
              👤 {assignee.name}
            </div>
          )}
        </div>

        {!isCompleted && onComplete && (
          <button
            onClick={() => onComplete(chore.id)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  );
};
```

**src/components/chores/ChoreForm.tsx:**
```typescript
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ChoreFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    pointsValue: number;
  }) => void;
  onCancel: () => void;
  initialData?: {
    title: string;
    description: string;
    pointsValue: number;
  };
}

export const ChoreForm: React.FC<ChoreFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [pointsValue, setPointsValue] = useState(initialData?.pointsValue || 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, pointsValue });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {initialData ? 'Edit Chore' : 'New Chore'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Chore Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Wash the dishes"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Optional details..."
            />
          </div>

          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-2">
              Points Value
            </label>
            <input
              id="points"
              type="number"
              value={pointsValue}
              onChange={(e) => setPointsValue(parseInt(e.target.value))}
              required
              min={0}
              max={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

**src/pages/Chores.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import { choresApi, Chore } from '../api/chores.api';
import { useAuthStore } from '../store/authStore';
import { ChoreCard } from '../components/chores/ChoreCard';
import { ChoreForm } from '../components/chores/ChoreForm';
import { Plus } from 'lucide-react';

export const Chores: React.FC = () => {
  const { user } = useAuthStore();
  const [chores, setChores] = useState<Chore[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isParent = user?.role === 'PARENT';

  const loadChores = async () => {
    setIsLoading(true);
    try {
      const filters = filter !== 'all' ? { status: filter.toUpperCase() } : {};
      const data = await choresApi.getAll(filters);
      setChores(data);
    } catch (error) {
      console.error('Failed to load chores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChores();
  }, [filter]);

  const handleCreateChore = async (data: {
    title: string;
    description: string;
    pointsValue: number;
  }) => {
    try {
      await choresApi.create(data);
      setIsFormOpen(false);
      loadChores();
    } catch (error) {
      console.error('Failed to create chore:', error);
      alert('Failed to create chore');
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    try {
      await choresApi.complete(choreId);
      loadChores();
    } catch (error) {
      console.error('Failed to complete chore:', error);
      alert('Failed to complete chore');
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    if (!confirm('Are you sure you want to delete this chore?')) {
      return;
    }

    try {
      await choresApi.delete(choreId);
      loadChores();
    } catch (error) {
      console.error('Failed to delete chore:', error);
      alert('Failed to delete chore');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Chores 🧹</h1>
          {isParent && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Chore</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-purple-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Chore List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading chores...</div>
          </div>
        ) : chores.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📋</div>
            <div className="text-xl text-gray-600 mb-2">No chores yet!</div>
            <div className="text-gray-500">
              {isParent
                ? 'Click "New Chore" to create one'
                : 'Check back later for new tasks'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chores.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                onComplete={handleCompleteChore}
                onDelete={handleDeleteChore}
                canManage={isParent}
              />
            ))}
          </div>
        )}

        {/* Form Modal */}
        {isFormOpen && (
          <ChoreForm
            onSubmit={handleCreateChore}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
```

**Update src/App.tsx to add Chores route:**
```typescript
import { Chores } from './pages/Chores';

// In Routes:
<Route
  path="/chores"
  element={
    <ProtectedRoute>
      <Chores />
    </ProtectedRoute>
  }
/>
```

**Deliverables:**
- ✅ Parents can create chores
- ✅ All users can view chores
- ✅ Filter chores by status
- ✅ Parents can delete chores
- ✅ Users can complete chores (points awarded)
- ✅ Responsive card layout
- ✅ Loading states

---

---

#### Milestone 2.3: User Management & Notifications (Day 9-10)
**Duration:** 6-8 hours

**Tasks:**
- [ ] Create user API endpoints
- [ ] Create notification service
- [ ] Create notification endpoints
- [ ] Build notification bell component
- [ ] Auto-create notifications on chore events
- [ ] Add notification polling or WebSocket (optional)

**Backend Files:**

**src/services/users.service.ts:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const usersService = {
  async getAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            assignedChores: true,
            completedChores: true,
          },
        },
      },
    });
  },

  async getStats(userId: string) {
    const [totalCompleted, totalPoints, recentCompletions] = await Promise.all([
      prisma.choreCompletion.count({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      }),
      prisma.choreCompletion.findMany({
        where: { userId },
        include: {
          chore: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalCompleted,
      totalPoints: totalPoints?.points || 0,
      recentCompletions,
    };
  },
};
```

**src/services/notifications.service.ts:**
```typescript
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export const notificationsService = {
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    return prisma.notification.create({
      data,
    });
  },

  async getForUser(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async delete(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  },

  // Helper to create notifications for chore events
  async notifyChoreAssigned(choreId: string, userId: string) {
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      select: { title: true },
    });

    if (!chore) return;

    await this.create({
      userId,
      type: 'CHORE_ASSIGNED',
      title: 'New chore assigned! 📋',
      message: `You have been assigned: ${chore.title}`,
      actionUrl: `/chores/${choreId}`,
    });
  },

  async notifyChoreCompleted(choreId: string, completedByUserId: string, parentId: string) {
    const [chore, user] = await Promise.all([
      prisma.chore.findUnique({
        where: { id: choreId },
        select: { title: true },
      }),
      prisma.user.findUnique({
        where: { id: completedByUserId },
        select: { name: true },
      }),
    ]);

    if (!chore || !user) return;

    // Notify the parent
    await this.create({
      userId: parentId,
      type: 'CHORE_COMPLETED',
      title: 'Chore completed! ✅',
      message: `${user.name} completed: ${chore.title}`,
      actionUrl: `/chores/${choreId}`,
    });
  },

  async notifyPointsEarned(userId: string, points: number, choreTitle: string) {
    await this.create({
      userId,
      type: 'POINTS_EARNED',
      title: 'Points earned! ⭐',
      message: `You earned ${points} points for: ${choreTitle}`,
      actionUrl: '/profile',
    });
  },
};
```

**Update src/services/chores.service.ts to trigger notifications:**
```typescript
// At the top, import notifications service
import { notificationsService } from './notifications.service';

// In the assign method, add:
async assign(choreId: string, userId: string, dueDate?: Date) {
  // ... existing code ...
  
  // Send notification
  await notificationsService.notifyChoreAssigned(choreId, userId);
  
  return assignment;
}

// In the complete method, add:
async complete(choreId: string, userId: string, notes?: string) {
  // ... existing code up to awarding points ...
  
  // Send notifications
  await notificationsService.notifyPointsEarned(
    userId,
    chore.pointsValue,
    chore.title
  );

  // Notify parent(s)
  const parents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    select: { id: true },
  });

  for (const parent of parents) {
    await notificationsService.notifyChoreCompleted(
      choreId,
      userId,
      parent.id
    );
  }

  return completion;
}
```

**Frontend Files:**

**src/api/notifications.api.ts:**
```typescript
import { apiClient } from './client';

export interface Notification {
  id: string;
  type: 'CHORE_ASSIGNED' | 'CHORE_COMPLETED' | 'POINTS_EARNED';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const notificationsApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/notifications');
    return data.notifications as Notification[];
  },

  getUnread: async () => {
    const { data } = await apiClient.get('/notifications?unreadOnly=true');
    return data.notifications as Notification[];
  },

  markAsRead: async (id: string) => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    await apiClient.put('/notifications/read-all');
  },

  delete: async (id: string) => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
```

**src/components/notifications/NotificationBell.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationsApi, Notification } from '../../api/notifications.api';
import { NotificationList } from './NotificationList';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Mark all read
                </button>
              )}
            </div>
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        </>
      )}
    </div>
  );
};
```

**Deliverables:**
- ✅ Notifications created on chore assignment
- ✅ Notifications created on chore completion
- ✅ Notifications created when points earned
- ✅ Notification bell shows unread count
- ✅ Can mark notifications as read
- ✅ Notifications auto-refresh

---

### WEEK 3: Polish & Deployment

#### Milestone 3.1: UI Polish & Navbar (Day 11-12)
**Duration:** 4-6 hours

**Tasks:**
- [ ] Create navbar with navigation
- [ ] Add user profile display
- [ ] Improve color scheme
- [ ] Add icons throughout
- [ ] Add smooth transitions
- [ ] Make fully responsive
- [ ] Add loading skeletons

**Create Navbar component and improve overall layout**

**Deliverables:**
- ✅ Professional navigation
- ✅ User info in header
- ✅ Notification bell integrated
- ✅ Mobile-responsive menu
- ✅ Consistent color scheme
- ✅ Smooth animations

---

#### Milestone 3.2: Error Handling & Edge Cases (Day 13)
**Duration:** 4-5 hours

**Tasks:**
- [ ] Add error boundaries in React
- [ ] Add toast notifications for errors
- [ ] Handle network failures gracefully
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test edge cases (empty states, long text, etc.)
- [ ] Add input validation feedback

**Deliverables:**
- ✅ Graceful error handling
- ✅ User-friendly error messages
- ✅ No app crashes
- ✅ Proper loading states everywhere

---

#### Milestone 3.3: Testing & Bug Fixes (Day 14-15)
**Duration:** 6-8 hours

**Tasks:**
- [ ] Test all features as each family member
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Fix any bugs found
- [ ] Verify all permissions work correctly
- [ ] Test database edge cases

**Testing Checklist:**
- [ ] Login as parent - create/edit/delete chores
- [ ] Login as child - view and complete chores
- [ ] Points update correctly
- [ ] Notifications appear correctly
- [ ] Can't access parent features as child
- [ ] Session persists on refresh
- [ ] Works on phone/tablet
- [ ] Works in Chrome, Firefox, Safari

---

## 🐳 Docker Setup

### Backend Dockerfile

**backend/Dockerfile:**
```dockerfile
# Multi-stage build for production

# Stage 1: Builder
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create directories
RUN mkdir -p /app/data /app/uploads && \
    chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command (runs migrations then starts server)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

**backend/.dockerignore:**
```
node_modules
dist
npm-debug.log
.env
*.db
*.db-journal
.git
.gitignore
README.md
.vscode
coverage
.DS_Store
```

---

### Frontend Dockerfile

**frontend/Dockerfile:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**frontend/nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss application/json;

    # SPA routing - all requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # IMPORTANT: Use $http_x_forwarded_proto to preserve protocol from upstream reverse proxy.
        # Do NOT use $scheme - it breaks TLS detection behind reverse proxies like Caddy.
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_cache_bypass $http_upgrade;
        
        # Cookie support for sessions
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
    }
}
```

**frontend/.dockerignore:**
```
node_modules
dist
.env
.env.local
npm-debug.log
.git
.gitignore
README.md
.vscode
.DS_Store
```

---

### Docker Compose Configuration

**docker-compose.yml** (Production):
```yaml
version: '3.8'

services:
  backend:
    container_name: chore-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/chores.db
      - SESSION_SECRET=${SESSION_SECRET}
      - PORT=3000
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3001}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      # Persist database
      - ./data:/app/data
      # Persist uploads (avatars, etc.)
      - ./uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - chore-network
    labels:
      - "com.docker.compose.project=chore-ganizer"
      - "traefik.enable=false"  # Set to true if using Traefik

  frontend:
    container_name: chore-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL:-http://localhost:3000}
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3001}:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - chore-network
    labels:
      - "com.docker.compose.project=chore-ganizer"

networks:
  chore-network:
    driver: bridge

# Uncomment if you want named volumes instead of bind mounts
# volumes:
#   chore-data:
#   chore-uploads:
```

**docker-compose.dev.yml** (Optional - for development with Docker):
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:/app/data/dev.db
      - SESSION_SECRET=dev-secret-not-secure
      - CORS_ORIGIN=http://localhost:5173
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
      - ./data:/app/data
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev
```

---

## 🚀 Deployment Guide

### Prerequisites on Homelab Server

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Create directory for the project
mkdir -p ~/apps/chore-ganizer
cd ~/apps/chore-ganizer
```

### Initial Deployment

```bash
# 1. Clone or upload your project
git clone https://github.com/thitar/chore-ganizer.git .
# OR upload files via SFTP/rsync

# 2. Create necessary directories
mkdir -p data uploads data/backups

# 3. Set permissions
chmod 755 data uploads
chmod 700 data/backups

# 4. Create .env file
cp .env.example .env
nano .env  # Edit with your values

# 5. Generate strong session secret
openssl rand -base64 32
# Copy output to SESSION_SECRET in .env

# 6. Build and start containers
docker-compose up -d --build

# 7. Check logs
docker-compose logs -f

# 8. Run database migrations
docker-compose exec backend npx prisma migrate deploy

# 9. Seed initial data
docker-compose exec backend npx prisma db seed

# 10. Verify health
curl http://localhost:3000/health
curl http://localhost:3001/
```

### .env Configuration for Production

```bash
# Production .env file

# Environment
NODE_ENV=production

# Session Security - CHANGE THIS!
SESSION_SECRET=YOUR_GENERATED_SECRET_HERE_AT_LEAST_32_CHARS

# Database
DATABASE_URL=file:/app/data/chores.db

# Server Configuration
PORT=3000
BACKEND_PORT=3000
FRONTEND_PORT=3001

# CORS (adjust if using reverse proxy)
CORS_ORIGIN=http://your-homelab-ip:3001

# API URL for frontend
VITE_API_URL=http://your-homelab-ip:3000

# Logging
LOG_LEVEL=info

# Optional: If using reverse proxy (Traefik, Nginx Proxy Manager)
# PUBLIC_URL=https://chores.yourdomain.com
```

### Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend npx prisma migrate deploy

# Check logs for errors
docker-compose logs -f --tail=100
```

### Stopping/Starting

```bash
# Stop containers
docker-compose stop

# Start containers
docker-compose start

# Restart containers
docker-compose restart

# Stop and remove containers (data persists in volumes)
docker-compose down

# Stop and remove everything including volumes (DANGER!)
docker-compose down -v
```

---

## 💾 Backup & Maintenance

### Automated Backup Script

**backup.sh:**
```bash
#!/bin/bash

# Chore-Ganizer Backup Script
# Run this script daily via cron

set -e

# Configuration
PROJECT_DIR="/home/yourusername/apps/chore-ganizer"
BACKUP_DIR="${PROJECT_DIR}/data/backups"
DB_FILE="${PROJECT_DIR}/data/chores.db"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chores_${TIMESTAMP}.db"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup..."

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    log "ERROR: Database file not found at $DB_FILE"
    exit 1
fi

# Create backup
cp "$DB_FILE" "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE (${SIZE})"
else
    log "ERROR: Backup failed"
    exit 1
fi

# Compress backup (optional)
gzip "$BACKUP_FILE"
log "Backup compressed: ${BACKUP_FILE}.gz"

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "chores_*.db.gz" -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "chores_*.db.gz" | wc -l)
log "Backup complete. Total backups: $BACKUP_COUNT"
```

**Make it executable:**
```bash
chmod +x backup.sh
```

**Add to crontab (daily at 2 AM):**
```bash
crontab -e

# Add this line:
0 2 * * * /home/yourusername/apps/chore-ganizer/backup.sh >> /home/yourusername/apps/chore-ganizer/data/backups/backup.log 2>&1
```

### Restore from Backup

```bash
# 1. Stop the application
docker-compose stop backend

# 2. Backup current database (just in case)
cp data/chores.db data/chores.db.pre-restore

# 3. Restore from backup
gunzip -c data/backups/chores_YYYYMMDD_HHMMSS.db.gz > data/chores.db

# 4. Restart
docker-compose start backend

# 5. Verify
docker-compose logs backend
curl http://localhost:3000/health
```

### Maintenance Tasks

**Monthly Maintenance Checklist:**
```bash
# 1. Check disk space
df -h

# 2. Check container status
docker-compose ps

# 3. Check logs for errors
docker-compose logs --tail=100 | grep -i error

# 4. Verify backups exist
ls -lh data/backups/

# 5. Prune old Docker images (frees space)
docker image prune -a -f

# 6. Update containers (optional)
docker-compose pull
docker-compose up -d
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist

**Authentication:**
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Logout works and clears session
- [ ] Session persists on page refresh
- [ ] Unauthorized access redirects to login

**Chores (as Parent):**
- [ ] Can create new chore
- [ ] Can edit chore
- [ ] Can delete chore (with confirmation)
- [ ] Can assign chore to family member
- [ ] Can see all chores
- [ ] Can filter by status

**Chores (as Child):**
- [ ] Can view assigned chores
- [ ] Can mark chore as complete
- [ ] Points are awarded on completion
- [ ] Cannot create/edit/delete chores
- [ ] Cannot assign chores

**Notifications:**
- [ ] Notification appears when chore assigned
- [ ] Notification appears when chore completed (for parent)
- [ ] Notification appears when points earned
- [ ] Can mark notification as read
- [ ] Unread count updates correctly
- [ ] Notifications persist in database

**Responsive Design:**
- [ ] Works on desktop (1920x1080)
- [ ] Works on tablet (768x1024)
- [ ] Works on mobile (375x667)
- [ ] Navigation works on small screens
- [ ] Forms are usable on mobile

**Cross-Browser:**
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Cannot connect to backend"

**Symptoms:**
- Frontend shows connection errors
- API calls fail with network errors

**Solutions:**
```bash
# 1. Check if backend is running
docker-compose ps

# 2. Check backend logs
docker-compose logs backend

# 3. Verify CORS settings
# In backend .env, ensure CORS_ORIGIN matches frontend URL

# 4. Test backend directly
curl http://localhost:3000/health

# 5. Check if ports are exposed
docker-compose port backend 3000
```

---

#### Issue: "Database locked"

**Symptoms:**
- Errors like "database is locked"
- Slow queries

**Solutions:**
```bash
# SQLite doesn't handle high concurrency well
# For homelab with 4-5 users, this should be rare

# 1. Restart backend
docker-compose restart backend

# 2. If persistent, consider increasing timeout
# In DATABASE_URL, add: ?timeout=10000

# 3. Check if multiple processes are accessing the DB
ps aux | grep chore
```

---

#### Issue: "Session not persisting"

**Symptoms:**
- Logged out on every page refresh
- Session doesn't work

**Solutions:**
```bash
# 1. Check SESSION_SECRET is set
docker-compose exec backend printenv SESSION_SECRET

# 2. Verify cookie settings
# In browser DevTools, check if cookies are being set

# 3. Ensure CORS credentials are enabled
# Frontend should use withCredentials: true

# 4. Check if using HTTPS without secure cookies
# In production with HTTPS, set cookie.secure = true
```

---

#### Issue: "Migrations fail"

**Symptoms:**
- Error running `prisma migrate deploy`
- Database schema mismatch

**Solutions:**
```bash
# 1. Check migration status
docker-compose exec backend npx prisma migrate status

# 2. Reset database (DANGER: loses all data!)
docker-compose exec backend npx prisma migrate reset

# 3. Or manually run migrations
docker-compose exec backend npx prisma migrate deploy

# 4. If all else fails, recreate from scratch
docker-compose down -v
docker-compose up -d --build
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

---

#### Issue: "Container keeps restarting"

**Symptoms:**
- Container status shows "Restarting"
- Health checks fail

**Solutions:**
```bash
# 1. Check logs
docker-compose logs backend --tail=100

# 2. Common causes:
#    - Missing environment variables
#    - Port already in use
#    - Database connection issues

# 3. Stop and inspect
docker-compose stop
docker-compose up backend  # Run without -d to see live logs

# 4. Check resource usage
docker stats
```

---

#### Issue: "Can't access from other devices"

**Symptoms:**
- Works on server, but not from phone/tablet
- Connection refused from LAN devices

**Solutions:**
```bash
# 1. Check firewall rules
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 3001

# 2. Ensure binding to 0.0.0.0, not 127.0.0.1
# In docker-compose.yml, ports should be:
# - "3000:3000"  (not "127.0.0.1:3000:3000")

# 3. Update CORS_ORIGIN to allow your network
# In .env:
# CORS_ORIGIN=http://192.168.1.100:3001

# 4. Test from other device
# From phone/tablet, navigate to:
# http://YOUR_SERVER_IP:3001
```

---

## 🎯 Future Enhancements (Post-MVP)

When you're ready to add more features, here's the recommended order:

### Phase 4: Rewards System (Week 4)
- Uncomment Reward models in Prisma schema
- Run migration
- Create rewards CRUD API
- Build rewards marketplace UI
- Add redemption flow
- Parent approval for redemptions

### Phase 5: Recurring Chores (Week 5)
- Add recurrence fields to Chore model
- Build recurrence configuration UI
- Create cron job or scheduled task
- Auto-create instances
- Handle timezone logic

### Phase 6: Round-Robin Assignment (Week 6)
- Add rotation group models
- Build rotation group management UI
- Implement rotation algorithm
- Auto-assign on rotation
- Integration with recurring chores

### Phase 7: Advanced Features (Week 7+)
- Dark mode
- Custom themes
- Profile pictures/avatars
- Chore templates
- Family calendar integration
- Mobile PWA
- Export data to CSV
- Detailed analytics

---

## 📊 Monitoring Integration

### Portainer Labels

Add these to your docker-compose.yml for better Portainer integration:

```yaml
services:
  backend:
    labels:
      - "io.portainer.accesscontrol.teams=family"
      - "description=Chore-ganizer backend API"
      
  frontend:
    labels:
      - "io.portainer.accesscontrol.teams=family"
      - "description=Chore-ganizer web interface"
```

### Traefik Integration (Optional)

If you use Traefik for reverse proxy:

```yaml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chores.rule=Host(`chores.yourdomain.local`)"
      - "traefik.http.routers.chores.entrypoints=web"
      - "traefik.http.services.chores.loadbalancer.server.port=80"
```

### Health Monitoring

Add this to your monitoring stack:

```yaml
# healthchecks.io or similar
# GET http://your-server:3000/health every 5 minutes
# Alert if status is not "ok"
```

---

## 📚 Additional Resources

### Helpful Commands

```bash
# View database with Prisma Studio
docker-compose exec backend npx prisma studio
# Then open http://localhost:5555

# Run Prisma commands
docker-compose exec backend npx prisma generate
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx prisma migrate status

# View logs
docker-compose logs -f
docker-compose logs backend -f
docker-compose logs frontend -f

# Shell into container
docker-compose exec backend sh
docker-compose exec frontend sh

# Check container resource usage
docker stats chore-backend chore-frontend

# Rebuild single service
docker-compose up -d --build backend

# View environment variables
docker-compose exec backend printenv
```

### Database Management

```bash
# Backup database manually
docker-compose exec backend sh -c "cp /app/data/chores.db /app/data/chores-$(date +%Y%m%d).db"

# Copy database out of container
docker cp chore-backend:/app/data/chores.db ./chores-backup.db

# View database size
docker-compose exec backend ls -lh /app/data/

# Vacuum database (compact and optimize)
docker-compose exec backend sh -c "echo 'VACUUM;' | sqlite3 /app/data/chores.db"
```

---

## ✅ Pre-Flight Checklist

Before showing the family:

**Security:**
- [ ] Changed SESSION_SECRET from default
- [ ] Changed all default passwords in seed.ts
- [ ] Firewall rules configured
- [ ] HTTPS setup (if public-facing)
- [ ] Backup script configured and tested

**Functionality:**
- [ ] All family members can login
- [ ] Parents can create chores
- [ ] Kids can complete chores
- [ ] Points are awarded correctly
- [ ] Notifications work
- [ ] Data persists across restarts

**User Experience:**
- [ ] App loads on all family devices
- [ ] Responsive on phones/tablets
- [ ] No console errors
- [ ] Forms validate properly
- [ ] Error messages are helpful

**Operations:**
- [ ] Docker containers start automatically on reboot
- [ ] Backups run daily
- [ ] Can restore from backup
- [ ] Know how to check logs
- [ ] Know how to deploy updates

---

## 🎉 Success Criteria

Your Chore-Ganizer is ready when:

1. ✅ All family members have accounts
2. ✅ Parents can create and assign chores
3. ✅ Kids can see their chores and mark them complete
4. ✅ Points are tracked correctly
5. ✅ Notifications keep everyone informed
6. ✅ App is accessible from all family devices
7. ✅ Data is backed up automatically
8. ✅ Everyone knows how to use it
9. ✅ Runs smoothly for at least 1 week
10. ✅ Family is actually using it daily!

---

## 📞 Support

For issues or questions:

1. Check this document's Troubleshooting section
2. Review Docker logs: `docker-compose logs`
3. Check Prisma docs: https://www.prisma.io/docs
4. Check React docs: https://react.dev
5. Ask on Homelab communities (r/homelab, r/selfhosted)

---

**Good luck with your Chore-Ganizer! May your family's chores be organized and your points plentiful! 🏠✨**
