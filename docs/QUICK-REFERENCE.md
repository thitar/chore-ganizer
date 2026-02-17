# 🚀 Chore-Ganizer Quick Reference

## 📱 Daily Operations

### Starting/Stopping the App

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View status
docker-compose ps
```

### Checking Logs

```bash
# Live logs (all services)
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Common Issues Quick Fixes

**App won't start:**
```bash
docker-compose down
docker-compose up -d --build
```

**Database issues:**
```bash
docker-compose restart backend
```

**Session problems:**
```bash
# Check if SESSION_SECRET is set
docker-compose exec backend printenv SESSION_SECRET
```

**Can't connect from phone/tablet:**
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3002
sudo ufw allow 3010
```

---

## 🔧 Maintenance

### Weekly Tasks

```bash
# Check if running
docker-compose ps

# Check disk space
df -h

# View recent logs for errors
docker-compose logs --tail=100 | grep -i error
```

### Monthly Tasks

```bash
# Verify backups exist
ls -lh data/backups/

# Clean old Docker images
docker image prune -a -f

# Update containers (optional)
docker-compose pull
docker-compose up -d
```

### Backup & Restore

**Manual Backup:**
```bash
./backup.sh
```

**Restore from Backup:**
```bash
# Stop backend
docker-compose stop backend

# Backup current (safety)
cp data/chore-ganizer.db data/chore-ganizer.db.pre-restore

# Restore
gunzip -c data/backups/chore-ganizer_YYYYMMDD_HHMMSS.db.gz > data/chore-ganizer.db

# Start backend
docker-compose start backend
```

---

## 👥 User Management

### Default Logins

**Parents:**
- dad@home / password123
- mom@home / password123

**Children:**
- alice@home / password123
- bob@home / password123

### Changing Passwords

Edit `backend/prisma/seed.ts` and change the password hash:
```typescript
password: await bcrypt.hash('your-new-password', 10),
```

Then re-seed:
```bash
docker-compose exec backend npx prisma db seed
```

### Adding New Family Members

1. Edit `backend/prisma/seed.ts`
2. Add new user to the array
3. Run: `docker-compose exec backend npx prisma db seed`

---

## 📊 Database

### View Database

```bash
# Open Prisma Studio (web UI)
docker-compose exec backend npx prisma studio
# Then open: http://localhost:5555
```

### Run Migrations

```bash
# Apply pending migrations
docker-compose exec backend npx prisma migrate deploy

# Check migration status
docker-compose exec backend npx prisma migrate status
```

### Database Stats

```bash
# Database size
docker-compose exec backend ls -lh /app/data/chore-ganizer.db

# Entry counts
docker-compose exec backend sh -c "echo 'SELECT COUNT(*) FROM User;' | sqlite3 /app/data/chore-ganizer.db"
docker-compose exec backend sh -c "echo 'SELECT COUNT(*) FROM ChoreAssignment;' | sqlite3 /app/data/chore-ganizer.db"
```

---

## 🔄 Updates

### Updating the App

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
docker-compose up -d --build

# 3. Run any new migrations
docker-compose exec backend npx prisma migrate deploy

# 4. Check logs
docker-compose logs -f --tail=100
```

---

## 🌐 Access URLs

**Local Access:**
- Frontend: http://localhost:3002
- Backend API: http://localhost:3010
- Health Check: http://localhost:3010/api/health
- Prisma Studio: http://localhost:5555

**Network Access (from other devices):**
- Frontend: http://YOUR_SERVER_IP:3002
- Backend API: http://YOUR_SERVER_IP:3010

**To find your server IP:**
```bash
hostname -I | awk '{print $1}'
```

---

## 🛤️ Application Routes

The application uses **React Router v6** for URL-based navigation.

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard` | Main dashboard | All users |
| `/chores` | Chore assignments | All users |
| `/profile` | User profile (via username click) | All users |
| `/users` | Family members | Parents only |
| `/templates` | Chore templates | Parents only |
| `/calendar` | Family calendar | Parents only |

> **Protected Routes:** `/templates` and `/calendar` are only accessible to parent accounts. Children are redirected to dashboard.

---

## 🔄 Recurring Chores

### API Endpoints

```
# Recurring Chores
POST   /api/recurring-chores                           # Create recurring chore (parents)
GET    /api/recurring-chores                           # List recurring chores
GET    /api/recurring-chores/:id                       # Get single recurring chore
PUT    /api/recurring-chores/:id                       # Update recurring chore (parents)
DELETE /api/recurring-chores/:id                       # Delete recurring chore (parents)
GET    /api/recurring-chores/occurrences               # List occurrences (30 days)
PATCH  /api/recurring-chores/occurrences/:id/complete  # Complete occurrence
PATCH  /api/recurring-chores/occurrences/:id/skip      # Skip occurrence
PATCH  /api/recurring-chores/occurrences/:id/unskip    # Unskip occurrence
```

### Database Models

```
RecurringChore          - Main recurring chore definition
RecurringChoreFixedAssignee    - Fixed assignees junction
RecurringChoreRoundRobinPool   - Round-robin pool junction
ChoreOccurrence         - Individual chore occurrences
ChoreOccurrenceStatus   - Enum: PENDING, COMPLETED, SKIPPED
```

### Key Types

```typescript
RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byDayOfWeek?: number[];
  byDayOfMonth?: number;
  byNthWeekday?: { week: number; day: number };
}

AssignmentMode: 'FIXED' | 'ROUND_ROBIN' | 'MIXED'
```

### Frontend Components

```
RecurrenceRuleEditor    - Configure recurrence patterns
AssignmentModeSelector  - Select fixed/round-robin/mixed assignments
OccurrenceList          - Display and filter occurrences
OccurrenceCard          - Individual occurrence display
RecurringChoresList     - Manage recurring chores
RecurringChoreFormModal - Create/edit modal
```

---

## 🆘 Emergency Commands

### Complete Reset (DANGER!)

**⚠️ This will delete ALL data!**

```bash
# Stop containers
docker-compose down -v

# Delete database
rm data/chore-ganizer.db

# Restart fresh
docker-compose up -d --build
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

### Force Rebuild

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean Everything

```bash
# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove all unused networks
docker network prune -f
```

---

## 📞 Getting Help

1. Check logs: `docker-compose logs -f`
2. Check health: `curl http://localhost:3010/api/health`
3. View database: `docker-compose exec backend npx prisma studio`
4. Read full documentation: `CHORE-GANIZER-DEVELOPMENT-PLAN.md`
5. Check troubleshooting section in development plan

---

## 🎯 Quick Performance Check

```bash
# Container resource usage
docker stats chore-backend chore-frontend

# Disk usage
du -sh data/

# Number of backups
ls data/backups/ | wc -l
```

---

**Keep this file handy for quick reference!**
