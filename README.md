# 🏠 Chore-Ganizer

A modern, family-friendly chore management system designed for homelab deployment. Built with React, TypeScript, Express, and SQLite.

## 📋 Features

### Current Features
 - ✅ **User Authentication** - Secure session-based login
 - ✅ **Chore Management** - Create, edit, delete, and assign chores
 - ✅ **Chore Templates** - Reusable chore definitions with categories
 - ✅ **Chore Categories** - Organize chores by type
 - ✅ **Calendar View** - Visual calendar of all family assignments
 - ✅ **Points System** - Earn points for completing chores
 - ✅ **Partial Completion** - Parents can mark chores as partially complete with custom points
 - ✅ **Personal Dashboard** - Each user sees only their own data
 - ✅ **User Color Customization** - Each family member has their own color on the calendar
 - ✅ **Templates Management** - Manage reusable chore templates
 - ✅ **Family Members Management** - Manage family member accounts
 - ✅ **Role-Based Access** - Different capabilities for parents and children
 - ✅ **Protected Routes** - Templates and Calendar pages restricted to parents
 - ✅ **Notifications** - In-app notifications for chore events
 - ✅ **Security Hardening** - Helmet headers, rate limiting, SQLite session store
 - ✅ **Password Policy** - Strong password requirements with strength indicator
 - ✅ **CSRF Protection** - Token-based cross-site request forgery protection
 - ✅ **Input Validation** - Zod schema validation on all API endpoints
 - ✅ **Responsive Design** - Works on desktop, tablet, and mobile
 - ✅ **Docker Deployment** - Easy deployment with Docker Compose

### Planned (Future)
- 🔜 Rewards marketplace
- 🔜 Recurring chores automation
- 🔜 Round-robin assignment rotation
- 🔜 Email notifications
- 🔜 Advanced analytics and charts

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Query
- React Router v6

**Backend:**
- Node.js 20 + Express + TypeScript
- Prisma ORM
- SQLite
- Express Session (authentication)
- Bcrypt (password hashing)
- Zod (validation)

**Deployment:**
- Docker + Docker Compose
- Nginx (frontend server)

## 🧭 Navigation & Routes

The application uses **React Router v6** for proper URL-based navigation. All pages have dedicated routes that can be bookmarked and shared.

### Available Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard` | Main dashboard (personal view) | All users |
| `/chores` | Chore assignments list | All users |
| `/profile` | User profile page | All users |
| `/users` | Family members management | Parents only |
| `/templates` | Chore templates management | Parents only |
| `/calendar` | Family calendar view | Parents only |

### Profile Access

The Profile page is accessed by clicking the **username** in the top-right corner of the navigation bar (not from the sidebar).

### Protected Routes

The `/templates` and `/calendar` routes are protected and only accessible to parent accounts. Children attempting to access these routes are redirected to the dashboard.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (for development)
- Docker & Docker Compose (for production)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chore-ganizer
   ```

2. **Set up backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

3. **Set up frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Prisma Studio: http://localhost:5555 (run `npx prisma studio`)

### Default Login Credentials

After running the seed script:

**Parents:**
- dad@home / password123
- mom@home / password123

**Children:**
- alice@home / password123
- bob@home / password123

**⚠️ Change these passwords in `backend/src/prisma/seed.ts` before deploying!**

## 🐳 Production Deployment

### Deployment Options

#### Option A: Direct Docker Deployment (Internal Network)
For internal network access without HTTPS:

```bash
docker compose up -d --build
# Access at http://YOUR_SERVER_IP:3002
```

#### Option B: Reverse Proxy Deployment (Recommended for Public Access)
For public internet access with HTTPS, use a reverse proxy like Caddy:

1. **Deploy the application**:
   ```bash
   docker compose up -d --build
   ```

2. **Configure Caddy** (example Caddyfile):
   ```caddyfile
   chore.yourdomain.com {
       reverse_proxy localhost:3002
   }
   ```

3. **Update environment variables**:
   ```bash
   # In .env file
   CORS_ORIGIN=https://chore.yourdomain.com
   SECURE_COOKIES=true
   VITE_DEBUG=false
   ```

4. **Restart containers**:
   ```bash
   docker compose restart
   ```

The app is currently deployed at **https://chore.thitar.ovh** using Caddy with automatic Let's Encrypt HTTPS.

### 1. Initial Setup

```bash
# On your homelab server
git clone <your-repo-url>
cd chore-ganizer

# Create required directories
mkdir -p data uploads data/backups

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Generate secure session secret
openssl rand -base64 32  # Copy output to SESSION_SECRET in .env
```

### 2. Deploy with Docker Compose

```bash
# Build and start containers
docker compose up -d --build

# The database is automatically migrated and seeded on first run
# Check status
docker compose ps
docker compose logs -f
```

### 3. Verify Deployment

```bash
# Check backend health
curl http://localhost:3002/api/health

# Check frontend
curl http://localhost:3002/

# Access from browser
# Navigate to: http://YOUR_SERVER_IP:3002
```

### 4. Set Up Backups

```bash
# Make backup script executable
chmod +x backup.sh

# Test backup
./backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/chore-ganizer/backup.sh >> /path/to/chore-ganizer/data/backups/backup.log 2>&1
```

## 📁 Project Structure

```
chore-ganizer/
├── backend/              # Express API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, validation, etc.
│   │   ├── prisma/       # Seed script
│   │   └── types/        # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── migrations/   # Database migrations
│   └── Dockerfile
│
├── frontend/             # React app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API client
│   │   ├── store/        # State management
│   │   └── hooks/        # Custom hooks
│   ├── nginx.conf
│   └── Dockerfile
│
├── docs/                 # Documentation
│   ├── ADMIN-GUIDE.md    # Admin/parent guide
│   ├── USER-GUIDE.md     # User/child guide
│   ├── API-DOCUMENTATION.md
│   └── ...               # Other docs
│
├── data/                 # Persistent data (gitignored)
│   ├── chore-ganizer.db  # SQLite database
│   ├── uploads/          # User uploads
│   └── backups/          # Database backups
│
├── docker-compose.yml    # Production deployment
├── backup.sh             # Automated backup script
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
DATABASE_URL=file:/app/data/chore-ganizer.db
SESSION_SECRET=your-secret-here
PORT=3010
CORS_ORIGIN=http://localhost:3002
LOG_LEVEL=info
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3002
```

See `.env.example` files for complete configuration options.

## 📊 Common Tasks

### Update Application

```bash
git pull
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
docker compose exec backend npx prisma studio

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Check migration status
docker compose exec backend npx prisma migrate status

# Manual backup
docker compose exec backend cp /app/data/chore-ganizer.db /app/data/chore-ganizer-$(date +%Y%m%d).db
```

### Restart Services

```bash
# Restart everything
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend

# Stop and start
docker compose down
docker compose up -d
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose logs backend

# Common issues:
# 1. Missing SESSION_SECRET in .env
# 2. Database file permissions
# 3. Port 3010 already in use

# Fix permissions
chmod 755 data
chown -R 1000:1000 data
```

### Cannot connect from other devices
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3002

# Update CORS_ORIGIN in .env to include your network
# CORS_ORIGIN=http://192.168.1.100:3002
```

### Database locked errors
```bash
# Restart backend
docker compose restart backend

# If persistent, increase timeout in DATABASE_URL:
# DATABASE_URL="file:/app/data/chore-ganizer.db?timeout=10000"
```

### Sessions not persisting
```bash
# Verify SESSION_SECRET is set
docker compose exec backend printenv SESSION_SECRET

# Check cookie settings in browser DevTools
# Ensure withCredentials: true in frontend API client
```

For more detailed troubleshooting, see the [Development Plan](./docs/CHORE-GANIZER-DEVELOPMENT-PLAN.md).

## 🔒 Security Considerations

### Before Deploying:
1. ✅ Change `SESSION_SECRET` to a strong random value
2. ✅ Update default passwords in `src/prisma/seed.ts`
3. ✅ Configure firewall rules
4. ✅ Set up HTTPS if exposing publicly (use reverse proxy)
5. ✅ Regular backups configured
6. ✅ Review CORS settings
7. ✅ Disable debug logging (`VITE_DEBUG=false`)

### Current Security Features:
- **Helmet middleware** - Security headers including CSP
- **Rate limiting** - 100 req/15min general, 5 req/15min for auth endpoints
- **Secure cookies** - HttpOnly, Secure, SameSite=Strict
- **SQLite session store** - Persistent sessions across restarts
- **Trust proxy** - Configured for reverse proxy deployment
- **Request size limits** - 10kb max request body
- **Password Policy** - 8+ chars, uppercase, lowercase, number, special char required
- **Password Strength Indicator** - Visual feedback during registration
- **CSRF Protection** - Token-based protection with `/api/csrf-token` endpoint
- **Input Validation** - Zod schema validation on all API endpoints

### For Public Internet Access:
- Use a reverse proxy (Caddy, Traefik, Nginx Proxy Manager)
- Enable HTTPS with Let's Encrypt
- Consider adding rate limiting
- Set up fail2ban for login attempts
- Use strong passwords for all accounts

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing Checklist

**As Parent:**
- [ ] Login works
- [ ] Can create new chore
- [ ] Can edit chore
- [ ] Can delete chore
- [ ] Can assign chore to family member
- [ ] Notifications appear correctly

**As Child:**
- [ ] Login works
- [ ] Can view assigned chores
- [ ] Can mark chore as complete
- [ ] Points are awarded
- [ ] Cannot create/edit/delete chores
- [ ] Notifications appear correctly

**Cross-Device:**
- [ ] Works on desktop
- [ ] Works on tablet
- [ ] Works on mobile phone
- [ ] Responsive design looks good

## 📚 Documentation

### User Guides
- **[User Guide](./docs/USER-GUIDE.md)** - Guide for children and family members
- **[Admin Guide](./docs/ADMIN-GUIDE.md)** - Guide for parents and administrators

### Getting Started
- **[README](./README.md)** - This file - project overview and quick start
- **[Quick Reference](./docs/QUICK-REFERENCE.md)** - Daily operations and common commands
- **[Deployment Checklist](./docs/DEPLOYMENT-CHECKLIST.md)** - Step-by-step deployment guide

### Implementation
- **[Development Plan](./docs/CHORE-GANIZER-DEVELOPMENT-PLAN.md)** - Complete implementation guide with detailed milestones
- **[Implementation Plan](./docs/IMPLEMENTATION-PLAN.md)** - Phase-by-phase implementation details
- **[Docker Configuration](./docs/DOCKER-CONFIGURATION.md)** - Docker setup, Dockerfiles, and docker-compose reference

### API Reference
- **[API Documentation](./docs/API-DOCUMENTATION.md)** - Complete REST API reference with all endpoints

### Operations
- **[Post-Deployment Guide](./docs/POST-DEPLOYMENT-GUIDE.md)** - User management, updates, rollbacks, and monitoring
- **[Backup & Restore Guide](./docs/BACKUP-RESTORE-GUIDE.md)** - Backup procedures, automated backups, and disaster recovery

### Implementation Logs
- **[Phase 1 Log](./docs/PHASE-1-IMPLEMENTATION-LOG.md)** - Project setup
- **[Phase 2 Log](./docs/PHASE-2-IMPLEMENTATION-LOG.md)** - Backend core
- **[Phase 3 Log](./docs/PHASE-3-IMPLEMENTATION-LOG.md)** - Frontend core
- **[Phase 4 Log](./docs/PHASE-4-IMPLEMENTATION-LOG.md)** - Docker configuration
- **[Phase 5 Log](./docs/PHASE-5-DEPLOYMENT-LOG.md)** - Testing & deployment
- **[Testing Log](./docs/TESTING-LOG.md)** - Test results

### Future
- **[Future Roadmap](./docs/FUTURE-ROADMAP.md)** - Planned features and enhancements

### Database
- **[Database Schema](./backend/prisma/schema.prisma)** - Prisma schema with comments

## 🤝 Contributing

This is a personal homelab project, but if you find it useful:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

See the [Future Roadmap](./docs/FUTURE-ROADMAP.md) for planned features.

## 💬 Support

Having issues? Check these resources:

1. **[Troubleshooting Guide](./docs/CHORE-GANIZER-DEVELOPMENT-PLAN.md#troubleshooting)** in the development plan
2. Review `docker compose logs` for error messages
3. Check [Prisma documentation](https://www.prisma.io/docs)
4. Visit [r/homelab](https://reddit.com/r/homelab) or [r/selfhosted](https://reddit.com/r/selfhosted)

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker](https://www.docker.com/)

## 📧 Contact

Project Link: [https://github.com/yourusername/chore-ganizer](https://github.com/yourusername/chore-ganizer)

---

**Made with ❤️ for organized families and happy kids!**
